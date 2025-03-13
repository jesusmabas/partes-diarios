import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useDailyReports } from "../hooks/useDailyReports";
import { formatCurrency, formatNumber, getWeekNumber } from "../utils/formatters";
import ReportPDFGenerator from "./ReportPDFGenerator";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useProjects } from "../hooks/useProjects";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useStorage } from "../hooks/useStorage";

const ReportsViewer = () => {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showPDFLink, setShowPDFLink] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editedReport, setEditedReport] = useState(null);
  const [pdfDisabledReason, setPdfDisabledReason] = useState("Selecciona un proyecto para generar el PDF.");
  const [pdfKey, setPdfKey] = useState(Date.now());
  
  // Referencia para evitar re-renders cíclicos
  const isInitialMount = useRef(true);

  // Obtener datos sin filtros iniciales
  const { reports, loading, error, deleteReport, fetchReports } = useDailyReports();
  const { projects } = useProjects();
  const { uploadFile, uploading: storageUploading, error: storageError } = useStorage();

  // Filtrar reportes basado en criterios locales (en memoria)
  const filteredReports = useMemo(() => {
    console.log("Calculando filteredReports, total reports:", reports?.length || 0);
    
    // Verifica que reports existe y es un array
    if (!Array.isArray(reports)) {
      console.error("reports no es un array:", reports);
      return [];
    }
    
    let result = [...reports]; // Clonar array para evitar mutaciones

    // Filtrar por proyecto si hay seleccionado
    if (selectedProjectId) {
      console.log(`Filtrando por proyecto: ${selectedProjectId}`);
      result = result.filter((report) => report.projectId === selectedProjectId);
      console.log(`Después de filtrar por proyecto: ${result.length} reportes`);
    }

    // Filtrar por fecha si hay rango definido
    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999); // Incluir todo el día final

      console.log(`Filtrando por fecha: ${start.toISOString()} - ${end.toISOString()}`);
      result = result.filter((report) => {
        if (!report.reportDate) {
          console.warn("Reporte sin fecha:", report);
          return false;
        }
        const reportDate = new Date(report.reportDate);
        return reportDate >= start && reportDate <= end;
      });
      console.log(`Después de filtrar por fecha: ${result.length} reportes`);
    }

    // Ordenar por fecha (más reciente primero)
    result = result.sort((a, b) => {
      if (!a.reportDate) return 1;
      if (!b.reportDate) return -1;
      return new Date(b.reportDate) - new Date(a.reportDate);
    });

    console.log(`Total de reportes filtrados: ${result.length}`);
    return result;
  }, [reports, selectedProjectId, dateRange.startDate, dateRange.endDate]);

  // Efecto para actualizar el estado de showPDFLink cuando cambian los filteredReports
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    console.log("Verificando disponibilidad para PDF:", {
      reportes: filteredReports.length,
      proyecto: selectedProjectId
    });
    
    if (filteredReports.length > 0 && selectedProjectId) {
      setShowPDFLink(true);
      setPdfDisabledReason(null);
      // No actualizamos pdfKey aquí para evitar bucles
    } else {
      setShowPDFLink(false);
      if (!selectedProjectId) {
        setPdfDisabledReason("Selecciona un proyecto para generar el PDF.");
      } else if (filteredReports.length === 0) {
        setPdfDisabledReason("No hay reportes que coincidan con los criterios de búsqueda.");
      }
    }
  }, [filteredReports, selectedProjectId]);

  const calculateTotals = useCallback((reportsArray) => {
    let totalLabor = 0;
    let totalMaterials = 0;
    let totalCost = 0;
    let totalInvoiced = 0;

    reportsArray.forEach((report) => {
      // Para proyectos por horas
      if (report.labor) {
        totalLabor += report.labor.totalLaborCost || 0;
      }
      
      totalMaterials += report.totalMaterialsCost || 0;
      
      // El coste total puede venir directamente o calcularse
      if (report.totalCost) {
        totalCost += report.totalCost;
      } else if (report.labor) {
        // Si no existe totalCost pero sí labor, calculamos la suma
        totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }

      // Para proyectos de presupuesto cerrado
      if (report.invoicedAmount) {
        totalInvoiced += report.invoicedAmount;
      }
    });

    return {
      totalLabor,
      totalMaterials,
      totalCost,
      totalInvoiced
    };
  }, []);

  // Calcular totales (memoizado para evitar recálculos innecesarios)
  const totals = useMemo(() => calculateTotals(filteredReports), [filteredReports, calculateTotals]);
  
  const handleDateRangeChange = useCallback((e) => {
    setDateRange((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleProjectChange = useCallback((e) => {
    setSelectedProjectId(e.target.value);
    if (e.target.value === "") {
      setPdfDisabledReason("Selecciona un proyecto para generar el PDF.");
    } else {
      setPdfDisabledReason(null);
      // Actualizar pdfKey aquí es seguro porque es un evento de usuario
      setPdfKey(Date.now());
    }
  }, []);

  const confirmDelete = useCallback((reportId) => {
    setReportToDelete(reportId);
  }, []);

  const handleDelete = useCallback(async () => {
    if (reportToDelete) {
      const success = await deleteReport(reportToDelete);
      if (success) {
        setReportToDelete(null);
      }
    }
  }, [reportToDelete, deleteReport]);

  const startEditing = useCallback((report) => {
    setEditingReportId(report.id);
    setEditedReport({ ...report });
  }, []);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditedReport((prev) => {
      if (!prev) return prev;
      
      if (name.includes(".")) {
        const [parent, field] = name.split(".");
        if (parent === "labor") {
          return { ...prev, labor: { ...prev.labor, [field]: value } };
        } else if (parent === "workPerformed") {
          const updatedValue = field === 'invoicedAmount' ? parseFloat(value) : value;
          return { ...prev, workPerformed: { ...prev.workPerformed, [field]: updatedValue } };
        }
      }
      return { ...prev, [name]: value };
    });
  }, []);

  const handleAddMaterial = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file || !editedReport) return;

    const description = prompt("Descripción del material:") || "";
    const costText = prompt("Coste del material (€):") || "0";
    const cost = parseFloat(costText) || 0;

    if (!description || isNaN(cost) || cost < 0) {
      alert("Por favor, completa la descripción y un coste válido (numérico y positivo) antes de subir el archivo.");
      return;
    }

    try {
      const url = await uploadFile(file, "invoices", `${editedReport.projectId}_${editedReport.reportDate}`);
      if (url) {
        const newMaterial = { id: Date.now(), description, cost, invoiceUrl: url };
        setEditedReport((prev) => ({
          ...prev,
          materials: [...(prev.materials || []), newMaterial],
        }));
      }
    } catch (err) {
      console.error("Error al subir material:", err);
    }
  }, [editedReport, uploadFile]);

  const handleRemoveMaterial = useCallback((id) => {
    setEditedReport((prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m.id !== id),
    }));
  }, []);

  const handleAddPhoto = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file || !editedReport) return;

    try {
      const url = await uploadFile(file, "photos", `${editedReport.projectId}_${editedReport.reportDate}`);
      if (url) {
        setEditedReport((prev) => ({
          ...prev,
          workPerformed: {
            ...prev.workPerformed,
            photos: [...(prev.workPerformed.photos || []), { id: Date.now(), url }],
          },
        }));
      }
    } catch (err) {
      console.error("Error al subir foto:", err);
    }
  }, [editedReport, uploadFile]);

  const handleRemovePhoto = useCallback((id) => {
    setEditedReport((prev) => ({
      ...prev,
      workPerformed: {
        ...prev.workPerformed,
        photos: prev.workPerformed.photos.filter((p) => p.id !== id),
      },
    }));
  }, []);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editedReport) return;
    
    try {
      const reportRef = doc(db, "dailyReports", editingReportId);

      // Preparar los datos a actualizar
      const updatedData = {
        reportDate: editedReport.reportDate,
        weekNumber: getWeekNumber(editedReport.reportDate),
        materials: editedReport.materials || [],
        workPerformed: {
          ...editedReport.workPerformed,
          description: editedReport.workPerformed.description,
          photos: editedReport.workPerformed.photos || [],
        },
      };

      // Si el proyecto es por horas, incluir los datos de labor
      if (editedReport.labor) {
        updatedData.labor = editedReport.labor;
      }

      // Si el proyecto es de presupuesto cerrado, incluir 'invoicedAmount'
      if(editedReport.workPerformed?.invoicedAmount !== undefined) {
        updatedData.invoicedAmount = editedReport.workPerformed.invoicedAmount;
      }

      // Calcular costos (solo si es por horas)
      const project = projects.find((p) => p.id === editedReport.projectId);
      if (project && project.type === "hourly") {
        const totalMaterialsCost = editedReport.materials.reduce((sum, m) => sum + (m.cost || 0), 0);
        updatedData.totalMaterialsCost = totalMaterialsCost;

        if (editedReport.labor && 
            editedReport.labor.officialHours != null && 
            editedReport.labor.workerHours != null) {
          updatedData.totalCost = (editedReport.labor.totalLaborCost || 0) + totalMaterialsCost;
        }
      }

      await updateDoc(reportRef, updatedData);
      setEditingReportId(null);
      setEditedReport(null);
      await fetchReports();
    } catch (err) {
      console.error("Error al guardar cambios:", err);
    }
  };

  // Cargar reportes solo al montar el componente
  useEffect(() => {
    console.log("ReportsViewer montado - cargando reportes");
    fetchReports();
    // Array vacío de dependencias para que solo se ejecute al montar
  }, []);

  if (loading && reports.length === 0) return <p>Cargando reportes...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <div className="reports-viewer">
      <h2>Informes</h2>

      {/* Selector de Proyecto */}
      <div className="filter-section">
        <label>Filtrar por Proyecto: </label>
        <select value={selectedProjectId} onChange={handleProjectChange}>
          <option value="">Todos los proyectos</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.id} - {project.client}
            </option>
          ))}
        </select>

        {/* Selectores de Fecha */}
        <div className="date-range">
          <div className="date-field">
            <label>Fecha de inicio:</label>
            <input type="date" name="startDate" value={dateRange.startDate} onChange={handleDateRangeChange} />
          </div>
          <div className="date-field">
            <label>Fecha de fin:</label>
            <input type="date" name="endDate" value={dateRange.endDate} onChange={handleDateRangeChange} />
          </div>
        </div>
      </div>

      {/* Resumen de totales */}
      {filteredReports.length > 0 && selectedProjectId && (
        <div className="totals-summary" style={{
          backgroundColor: "#f5f7fa",
          padding: "15px",
          borderRadius: "8px",
          marginTop: "20px",
          marginBottom: "20px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
        }}>
          <h3 style={{ marginTop: "0", marginBottom: "10px" }}>Resumen de totales</h3>
          
          {projects.find(p => p.id === selectedProjectId)?.type === "hourly" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <strong>Total mano de obra:</strong>
                <span>{formatCurrency(totals.totalLabor)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <strong>Total materiales:</strong>
                <span>{formatCurrency(totals.totalMaterials)}</span>
              </div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between",
                borderTop: "1px solid #ddd",
                paddingTop: "10px",
                fontWeight: "bold"
              }}>
                <strong>TOTAL GENERAL:</strong>
                <span>{formatCurrency(totals.totalCost)}</span>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Total facturado:</strong>
              <span>{formatCurrency(totals.totalInvoiced)}</span>
            </div>
          )}
        </div>
      )}

      {/* Un solo botón para PDF con tu color de acento */}
      {filteredReports.length > 0 && selectedProjectId ? (
        <div key={pdfKey}>
          <PDFDownloadLink
            document={
              <ReportPDFGenerator 
                reports={filteredReports.map(r => ({...r}))} 
                projects={projects.map(p => ({...p}))} 
              />
            }
            fileName={`informe_${selectedProjectId || 'todos'}_${dateRange.startDate || 'inicio'}_${dateRange.endDate || 'fin'}.pdf`}
            style={{
              display: "block",
              margin: "0 0 20px 0",
              padding: "12px 20px",
              backgroundColor: "#8D432D", // Tu color de acento
              color: "white",
              textDecoration: "none",
              textAlign: "center",
              borderRadius: "4px",
              cursor: "pointer",
              border: "none",
              fontSize: "16px",
              width: "100%",
              boxSizing: "border-box",
              fontWeight: "500"
            }}
          >
            {({ blob, url, loading, error }) => {
              // Reducir los logs para evitar sobrecarga en la consola
              if (error) {
                console.error("Error en PDFDownloadLink:", error);
                return "Error al generar PDF";
              }
              return loading ? "Preparando PDF..." : "Descargar Informe en PDF";
            }}
          </PDFDownloadLink>
        </div>
      ) : (
        <p style={{ color: "#666", fontStyle: "italic" }}>
          {pdfDisabledReason || "Para generar un PDF, selecciona un proyecto y asegúrate de que haya reportes disponibles."}
        </p>
      )}

      <h3 className="section-title">Partes en el rango seleccionado:</h3>

      {filteredReports.length === 0 ? (
        <p>No hay partes que coincidan con los criterios de búsqueda.</p>
      ) : (
        filteredReports.map((report) => {
          const project = projects.find((p) => p.id === report.projectId) || {};
          const isEditing = editingReportId === report.id;

          return (
            <div key={report.id} className="report-card">
              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="edit-form">
                  <label>Fecha del parte:</label>
                  <input
                    type="date"
                    name="reportDate"
                    value={editedReport.reportDate}
                    onChange={handleEditChange}
                  />

                  {project.type === 'hourly' && <>
                    <h4>Mano de obra</h4>
                    <div className="labor-row">
                      <div className="labor-field">
                        <label>Hora entrada oficial</label>
                        <input
                          type="time"
                          name="labor.officialEntry"
                          value={editedReport.labor?.officialEntry || ""}
                          onChange={handleEditChange}
                          className="time-input"
                        />
                      </div>
                      <div className="labor-field">
                        <label>Hora salida oficial</label>
                        <input
                          type="time"
                          name="labor.officialExit"
                          value={editedReport.labor?.officialExit || ""}
                          onChange={handleEditChange}
                          className="time-input"
                        />
                      </div>
                    </div>

                    <div className="labor-row">
                      <div className="labor-field">
                        <label>Hora entrada peón</label>
                        <input
                          type="time"
                          name="labor.workerEntry"
                          value={editedReport.labor?.workerEntry || ""}
                          onChange={handleEditChange}
                          className="time-input"
                        />
                      </div>
                      <div className="labor-field">
                        <label>Hora salida peón</label>
                        <input
                          type="time"
                          name="labor.workerExit"
                          value={editedReport.labor?.workerExit || ""}
                          onChange={handleEditChange}
                          className="time-input"
                        />
                      </div>
                    </div>
                  </>}
                  <label>Descripción trabajos:</label>
                  <textarea
                    name="workPerformed.description"
                    value={editedReport.workPerformed?.description || ""}
                    onChange={handleEditChange}
                  />
                  {project.type === 'fixed' && (
                    <>
                      <label>Importe Facturado (€)</label>
                      <input
                        type="number"
                        name="workPerformed.invoicedAmount"
                        min="0"
                        step="0.01"
                        value={editedReport.workPerformed?.invoicedAmount || 0}
                        onChange={handleEditChange}
                      />
                    </>
                  )}

                  <h4>Materiales</h4>
                  {editedReport.materials?.map((m) => (
                    <div key={m.id} className="material-item">
                      <input
                        type="text"
                        value={m.description || ""}
                        onChange={(e) =>
                          setEditedReport((prev) => ({
                            ...prev,
                            materials: prev.materials.map((item) =>
                              item.id === m.id ? { ...item, description: e.target.value } : item
                            ),
                          }))
                        }
                      />
                      <input
                        type="number"
                        value={m.cost || 0}
                        onChange={(e) =>
                          setEditedReport((prev) => ({
                            ...prev,
                            materials: prev.materials.map((item) =>
                              item.id === m.id ? { ...item, cost: parseFloat(e.target.value) || 0 } : item
                            ),
                          }))
                        }
                        min="0"
                        step="0.01"
                      />
                      <a href={m.invoiceUrl} target="_blank" rel="noopener noreferrer">
                        Ver factura
                      </a>
                      <button onClick={() => handleRemoveMaterial(m.id)} type="button">Eliminar</button>
                    </div>
                  ))}
                  <input type="file" accept=".pdf" onChange={handleAddMaterial} disabled={storageUploading} />
                  {storageUploading && <p>Subiendo material...</p>}
                  {storageError && <p className="error-message">Error: {storageError}</p>}
                  <h4>Fotografías</h4>
                  <div className="photos-container">
                    {editedReport.workPerformed?.photos?.map((photo) => (
                      <div key={photo.id} className="photo-container">
                        <img src={photo.url} alt="Foto" style={{ width: "100px" }} />
                        <button onClick={() => handleRemovePhoto(photo.id)} type="button">Eliminar</button>
                      </div>
                    ))}
                  </div>
                  <input type="file" accept="image/*" onChange={handleAddPhoto} disabled={storageUploading} />
                  {storageUploading && <p>Subiendo foto...</p>}
                  {storageError && <p className="error-message">Error: {storageError}</p>}
                  <button type="submit">Guardar cambios</button>
                  <button type="button" onClick={() => setEditingReportId(null)}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <h4>Parte del {new Date(report.reportDate).toLocaleDateString()}</h4>
                  <p>
                    <strong>Semana:</strong> {report.weekNumber}
                  </p>
                  <p>
                    <strong>Proyecto:</strong> {report.projectId}
                  </p>
                  <p>
                    <strong>Cliente:</strong> {project.client || "No disponible"}
                  </p>
                  <p>
                    <strong>Dirección:</strong> {project.address || "No disponible"}
                  </p>

                  {project.type === "hourly" ? (
                    <>
                      <h5>Mano de obra</h5>
                      <p>Oficial: {formatNumber(report.labor?.officialHours || 0)} h - {formatCurrency(report.labor?.officialCost || 0)}</p>
                      <p>Peón: {formatNumber(report.labor?.workerHours || 0)} h - {formatCurrency(report.labor?.workerCost || 0)}</p>
                      <p>Total mano de obra: {formatCurrency(report.labor?.totalLaborCost || 0)}</p>
                      <h5>Materiales</h5>
                      {report.materials && report.materials.length > 0 ? (
                        report.materials.map((m, i) => (
                          <p key={i}>
                            {m.description} - {formatCurrency(m.cost)} (
                            <a href={m.invoiceUrl} target="_blank" rel="noopener noreferrer">
                              Ver factura
                            </a>
                            )
                          </p>
                        ))
                      ) : (
                        <p>No hay materiales registrados.</p>
                      )}
                      <p>Total materiales: {formatCurrency(report.totalMaterialsCost || 0)}</p>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>Importe facturado:</strong>{" "}
                        {formatCurrency(report.invoicedAmount || 0)}
                      </p>
                    </>
                  )}

                  <h5>Trabajos realizados</h5>
                  <p>{report.workPerformed?.description || "Sin descripción"}</p>
                  <div className="photos-container">
                    {report.workPerformed?.photos?.map((photo, i) => (
                      <img
                        key={i}
                        src={photo.url}
                        alt={`Foto ${i + 1}`}
                        style={{ width: "100px", marginRight: "10px" }}
                      />
                    ))}
                  </div>

                  {project.type === "hourly" && (
                    <p>
                      <strong>Total:</strong> {formatCurrency(report.totalCost || 0)}
                    </p>
                  )}

                  <button onClick={() => startEditing(report)}>Editar</button>
                  <button
                    onClick={() => confirmDelete(report.id)}
                    style={{ backgroundColor: "#e74c3c", marginLeft: "10px" }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          );
        })
      )}
      
      {reportToDelete && (
        <div className="modal">
          <p>¿Seguro que quieres eliminar este parte?</p>
          <button onClick={handleDelete} style={{ marginRight: "10px" }}>
            Sí
          </button>
          <button onClick={() => setReportToDelete(null)}>No</button>
        </div>
      )}
    </div>
  );
};

export default React.memo(ReportsViewer);