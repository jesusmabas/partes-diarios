import React, { useState, useCallback, useEffect } from "react";
import { useDailyReports } from "../hooks/useDailyReports";
import { formatCurrency, formatNumber, getWeekNumber } from "../utils/formatters";
import ReportPDFGenerator from "./ReportPDFGenerator";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useProjects } from "../hooks/useProjects";
import { updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import { useStorage } from "../hooks/useStorage";

const ReportsViewer = () => {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [showPDFLink, setShowPDFLink] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editedReport, setEditedReport] = useState(null);
  const { reports, loading, error, deleteReport } = useDailyReports(dateRange);
  const { projects } = useProjects();
  const { uploadFile, uploading: storageUploading, error: storageError } = useStorage();

  const handleDateRangeChange = useCallback((e) => {
    setDateRange((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleGeneratePDF = () => {
    if (reports.length > 0) {
      setShowPDFLink(true);
      console.log("Generando PDF:", reports);
    } else {
      console.log("No hay reportes para generar PDF.");
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
          return { ...prev, workPerformed: { ...prev.workPerformed, [field]: value } };
        }
      }
      return { ...prev, [name]: value };
    });
  }, []);

  const handleAddMaterial = useCallback(async (e) => {
    const file = e.target.files[0];
    const description = prompt("Descripción del material:") || "";
    const cost = parseFloat(prompt("Coste del material (€):") || 0) || 0;

    if (!file || !description || !cost) {
      alert("Por favor, completa la descripción y el coste antes de subir el archivo.");
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
      await updateDoc(reportRef, {
        reportDate: editedReport.reportDate,
        weekNumber: getWeekNumber(editedReport.reportDate),
        labor: editedReport.labor,
        materials: editedReport.materials || [],
        workPerformed: {
          ...editedReport.workPerformed,
          description: editedReport.workPerformed.description,
          photos: editedReport.workPerformed.photos || [],
        },
      });
      setEditingReportId(null);
      setEditedReport(null);
    } catch (err) {
      console.error("Error al guardar cambios:", err);
    }
  };

  useEffect(() => {
    if (reports.length > 0) {
      console.log("Datos disponibles para PDF:", reports);
    } else {
      console.log("No hay reportes para generar PDF.");
    }
  }, [reports]);

  if (loading) return <p>Cargando reportes...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <div className="reports-viewer">
      <h2>Informes</h2>
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
      <button onClick={handleGeneratePDF} disabled={!reports.length}>
        Generar PDF
      </button>
      {showPDFLink && reports.length > 0 && (
        <PDFDownloadLink
          document={<ReportPDFGenerator reports={reports} projects={projects} />}
          fileName={`informe_${dateRange.startDate}_${dateRange.endDate}.pdf`}
        >
          {({ loading: pdfLoading }) => (pdfLoading ? "Generando PDF..." : "Descargar Informe en PDF")}
        </PDFDownloadLink>
      )}
      <h3>Partes en el rango seleccionado:</h3>
      {reports.map((report) => {
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
                <h4>Mano de obra</h4>
                <div className="labor-row">
                  <div className="labor-field">
                    <label>Hora entrada oficial</label>
                    <input
                      type="time"
                      name="labor.officialEntry"
                      value={editedReport.labor.officialEntry}
                      onChange={handleEditChange}
                      className="time-input"
                    />
                  </div>
                  <div className="labor-field">
                    <label>Hora salida oficial</label>
                    <input
                      type="time"
                      name="labor.officialExit"
                      value={editedReport.labor.officialExit}
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
                      value={editedReport.labor.workerEntry}
                      onChange={handleEditChange}
                      className="time-input"
                    />
                  </div>
                  <div className="labor-field">
                    <label>Hora salida peón</label>
                    <input
                      type="time"
                      name="labor.workerExit"
                      value={editedReport.labor.workerExit}
                      onChange={handleEditChange}
                      className="time-input"
                    />
                  </div>
                </div>
                <label>Descripción trabajos:</label>
                <textarea
                  name="workPerformed.description"
                  value={editedReport.workPerformed.description}
                  onChange={handleEditChange}
                />
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
                <h5>Mano de obra</h5>
                <p>Oficial: {formatNumber(report.labor.officialHours)} h - {formatCurrency(report.labor.officialCost)}</p>
                <p>Peón: {formatNumber(report.labor.workerHours)} h - {formatCurrency(report.labor.workerCost)}</p>
                <p>Total mano de obra: {formatCurrency(report.labor.totalLaborCost)}</p>
                <h5>Materiales</h5>
                {report.materials.length > 0 ? (
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
                <p>Total materiales: {formatCurrency(report.totalMaterialsCost)}</p>
                <h5>Trabajos realizados</h5>
                <p>{report.workPerformed.description || "Sin descripción"}</p>
                <div className="photos-container">
                  {report.workPerformed.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo.url}
                      alt={`Foto ${i + 1}`}
                      style={{ width: "100px", marginRight: "10px" }}
                    />
                  ))}
                </div>
                <p>
                  <strong>Total:</strong> {formatCurrency(report.totalCost)}
                </p>
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