import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  const [selectedProjectId, setSelectedProjectId] = useState(""); // Nuevo estado para el proyecto seleccionado
  const [showPDFLink, setShowPDFLink] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editedReport, setEditedReport] = useState(null);
  const [pdfDisabledReason, setPdfDisabledReason] = useState(null); // NUEVO: Estado para el mensaje

  // Los hooks se usan sin filtros iniciales
  const { reports, loading, error, deleteReport, fetchReports } = useDailyReports(); // <--- Sin dateRange!
  const { projects } = useProjects();
  const { uploadFile, uploading: storageUploading, error: storageError } = useStorage();
  
  const calculateTotals = (reports) => {
    let totalLabor = 0;
    let totalMaterials = 0;
    let totalCost = 0;
    let totalInvoiced = 0;

    reports.forEach((report) => {
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
  };
  
  const handleDateRangeChange = useCallback((e) => {
    setDateRange((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleProjectChange = useCallback((e) => {
    setSelectedProjectId(e.target.value);
    //setDateRange({ startDate: "", endDate: "" }); // <- Podrías resetear, pero no es obligatorio
    if (e.target.value === "") {
      setPdfDisabledReason("Selecciona un proyecto para generar el PDF.");
    } else {
      setPdfDisabledReason(null); // Limpia el mensaje si se selecciona un proyecto
    }
  }, []);

  const handleGeneratePDF = () => {
    if (filteredReports.length > 0 && selectedProjectId) { //  <-  Comprobación adicional
      setShowPDFLink(true);
      console.log("Generando PDF:", filteredReports);
    } else {
      console.log("No hay reportes para generar PDF, o no se ha seleccionado un proyecto.");
      // Aquí también podrías establecer un mensaje de error, si quieres
    }
  };

  const confirmDelete = (reportId) => setReportToDelete(reportId);

  const handleDelete = async () => {
    if (reportToDelete && (await deleteReport(reportToDelete))) {
      setReportToDelete(null);
    }
  };

  const startEditing = (report) => {
    setEditingReportId(report.id);
    setEditedReport({ ...report });
  };

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditedReport((prev) => {
      if (name.includes(".")) {
        const [parent, field] = name.split(".");
        if (parent === "labor") {
          return { ...prev, labor: { ...prev.labor, [field]: value } };
        } else if (parent === "workPerformed") {
          //Si se modifica el invoicedAmount, hay que parsearlo a Float.
          const updatedValue = field === 'invoicedAmount' ? parseFloat(value) : value;
          return { ...prev, workPerformed: { ...prev.workPerformed, [field]: updatedValue } };
        }
      }
      //Si es un campo de los que no está dentro de un objeto anidado
      return { ...prev, [name]: value };
    });
  }, []);

  const handleAddMaterial = useCallback(async (e) => {
    const file = e.target.files[0];
    const description = prompt("Descripción del material:") || "";
    const cost = parseFloat(prompt("Coste del material (€):") || 0) || 0; //Ahora cost es SIEMPRE un número

    if (!file || !description || isNaN(cost) || cost < 0) {
      alert("Por favor, completa la descripción y un coste válido (numérico y positivo) antes de subir el archivo.");
      return;
    }

    try {
      const url = await uploadFile(file, "invoices", `${editedReport.projectId}_${editedReport.reportDate}`);
      if (url) {
        const newMaterial = { id: Date.now(), description, cost, invoiceUrl: url }; // cost ya es un número
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
    if (!file) return;

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
    try {
      const reportRef = doc(db, "dailyReports", editingReportId);

      // Preparar los datos a actualizar, manejando los casos de proyecto por horas y presupuesto cerrado
      const updatedData = {
        reportDate: editedReport.reportDate,
        weekNumber: getWeekNumber(editedReport.reportDate),
        materials: editedReport.materials || [],  // Asegura que sea un array
        workPerformed: {
          ...editedReport.workPerformed,
          description: editedReport.workPerformed.description,
          photos: editedReport.workPerformed.photos || [], // Asegura que sea un array
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

      // --- Calcular totalMaterialsCost (SOLO si es por horas) ---
      const project = projects.find((p) => p.id === editedReport.projectId); //Obtenemos proyecto
      if (project && project.type === "hourly") { //Si existe proyecto y es de tipo hourly
        const totalMaterialsCost = editedReport.materials.reduce((sum, m) => sum + (m.cost || 0), 0);
        updatedData.totalMaterialsCost = totalMaterialsCost;

        // --- Calcular totalCost (SOLO si es por horas) ---
        //  Necesitas *todos* los datos de labor. Si no los tienes, no calcules totalCost
        if (editedReport.labor && editedReport.labor.officialHours != null && editedReport.labor.workerHours != null) {
          //Usamos los datos que ya tenemos en editedReport, que ya tiene los datos de useLabor
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

  // FILTRO COMBINADO: Primero por proyecto, luego por fechas
  const filteredReports = useMemo(() => {
    let result = reports;

    if (selectedProjectId) {
      result = result.filter((report) => report.projectId === selectedProjectId);
    }

    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999); // Incluir todo el día final

      result = result.filter((report) => {
        const reportDate = new Date(report.reportDate);
        return reportDate >= start && reportDate <= end;
      });
    }

    return result.sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate)); // Ordenar por fecha
  }, [reports, selectedProjectId, dateRange]);

  // Calcular totales DESPUÉS del useMemo, NO dentro
  const totals = calculateTotals(filteredReports);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, selectedProjectId, dateRange]);

  useEffect(() => {
    if (filteredReports.length > 0) {
      console.log("Datos disponibles para PDF:", filteredReports);
    } else {
      console.log("No hay reportes para generar PDF.");
    }
  }, [filteredReports]);

  if (loading) return <p>Cargando reportes...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <div className="reports-viewer">
      <h2>Informes</h2>

      {/* Selector de Proyecto */}
      <div>
        <label>Filtrar por Proyecto: </label>
        <select value={selectedProjectId} onChange={handleProjectChange}>
          <option value="">Todos los proyectos</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.id} - {project.client}
            </option>
          ))}
        </select>
      </div>

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

      {/* Botón y enlace de descarga */}
      <button onClick={handleGeneratePDF} disabled={!selectedProjectId || !filteredReports.length}>
        Generar PDF
      </button>
      {/* Mensaje de deshabilitación */}
      {pdfDisabledReason && <p style={{ color: "red" }}>{pdfDisabledReason}</p>}

      {showPDFLink && filteredReports.length > 0 && (
        <PDFDownloadLink
          document={<ReportPDFGenerator reports={filteredReports} projects={projects} />}
          fileName={`informe_${selectedProjectId || 'todos'}_${dateRange.startDate || 'inicio'}_${dateRange.endDate || 'fin'}.pdf`}
        >
          {({ loading: pdfLoading }) => (pdfLoading ? "Generando PDF..." : "Descargar Informe en PDF")}
        </PDFDownloadLink>
      )}

      <h3>Partes en el rango seleccionado:</h3>

      {filteredReports.map((report) => {
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
                      name="invoicedAmount"
                      min="0"
                      step="0.01"
                      value={editedReport.workPerformed?.invoicedAmount}
                      onChange={handleEditChange}
                    />
                  </>
                )}

                <h4>Materiales</h4>
                {editedReport.materials?.map((m) => (
                  <div key={m.id} className="material-item">
                    <input
                      type="text"
                      value={m.description}
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
                      value={m.cost}
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
                    <button onClick={() => handleRemoveMaterial(m.id)}>Eliminar</button>
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
                      <button onClick={() => handleRemovePhoto(photo.id)}>Eliminar</button>
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
      })}
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