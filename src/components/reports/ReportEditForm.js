// src/components/reports/ReportEditForm.js (Completo)
import React, { useState, useEffect, useCallback } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Importar updateDoc
import { db } from "../../firebase";
import { getWeekNumber } from "../../utils/calculationUtils";
import { useStorage } from "../../hooks/useStorage";
import { useCalculationsService } from "../../hooks/useCalculationsService";
import MaterialsEditor from "./MaterialsEditor";
import PhotosEditor from "./PhotosEditor";

const ReportEditForm = ({ reportId, projects, onCancel, onComplete }) => {
  const [editedReport, setEditedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { uploadFile } = useStorage();
  const { calculateLabor, calculateMaterials } = useCalculationsService();

  // Efecto para bloquear scroll cuando el modal está abierto
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.body.classList.add('body-no-scroll');
    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.body.classList.remove('body-no-scroll');
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onCancel]);

  // Cargar datos del reporte
  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        const reportRef = doc(db, "dailyReports", reportId);
        const reportSnap = await getDoc(reportRef);

        if (reportSnap.exists()) {
          setEditedReport({ id: reportSnap.id, ...reportSnap.data() });
        } else {
          setError("El reporte no existe");
        }
      } catch (err) {
        setError(`Error al cargar el reporte: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  // Manejador de cambios para inputs (incluyendo isBilled)
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;

    setEditedReport(prev => {
      if (!prev) return prev;

      let updatedValue = value;
      if (type === "checkbox") {
        updatedValue = checked; // Para checkboxes, usa el valor de 'checked'
      }

      if (name.includes(".")) {
        const [parent, field] = name.split(".")
        if (parent === "labor") {
          return { ...prev, labor: { ...prev.labor, [field]: updatedValue } };
        } else if (parent === "workPerformed") {
          updatedValue = field === 'invoicedAmount' ? parseFloat(value) : value;
          return { ...prev, workPerformed: { ...prev.workPerformed, [field]: updatedValue } };
        }
      }
      return { ...prev, [name]: updatedValue };
    });
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editedReport) return;

    try {      setLoading(true);
      const reportRef = doc(db, "dailyReports", reportId);

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
        isBilled: !!editedReport.isBilled, // Asegura que sea booleano
      };

      // Lógica específica por tipo de proyecto
      const project = projects.find((p) => p.id === editedReport.projectId);

      if (editedReport.labor) {
        const laborData = calculateLabor(editedReport.labor, project);
        updatedData.labor = { ...editedReport.labor, ...laborData };
      }

      if (editedReport.workPerformed?.invoicedAmount !== undefined) {
        updatedData.invoicedAmount = editedReport.workPerformed.invoicedAmount;
      }

      if (project && project.type === "hourly") {
        const materialsData = calculateMaterials(editedReport.materials);
        updatedData.totalMaterialsCost = materialsData.totalMaterialsCost;

        if (editedReport.labor) {
          const laborData = calculateLabor(editedReport.labor, project);
          updatedData.totalCost = laborData.totalLaborCost + materialsData.totalMaterialsCost;
        }
      }

      await updateDoc(reportRef, updatedData); // Usar updateDoc
      onComplete();
    } catch (err) {
      setError(`Error al guardar cambios: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manejadores para materiales y fotos
  const handleMaterialsChange = useCallback((materials) => {
    setEditedReport(prev => ({
      ...prev,
      materials
    }));
  }, []);

  const handlePhotosChange = useCallback((photos) => {
    setEditedReport(prev => ({
      ...prev,
      workPerformed: {
        ...prev.workPerformed,
        photos
      }
    }));
  }, []);

  if (loading && !editedReport) return <p>Cargando reporte...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!editedReport) return <p>No se encontró el reporte</p>;

  const project = projects.find(p => p.id === editedReport.projectId) || {};
  const isHourlyProject = project.type === "hourly";

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      {error && <p className="error-message">{error}</p>}

      <label>Fecha del parte:</label>
      <input
        type="date"
        name="reportDate"
        value={editedReport.reportDate}
        onChange={handleInputChange}
        required
      />

      {/* Checkbox para isBilled */}
      <label>
        <input
          type="checkbox"
          name="isBilled"
          checked={!!editedReport.isBilled} // Usar doble negación para asegurar booleano
          onChange={handleInputChange}
        />
        Facturado
      </label>

      {isHourlyProject ? (
        <>
          <h4>Mano de obra</h4>
          <div className="labor-row">
            <div className="labor-field">
              <label>Hora entrada oficial</label>
              <input
                type="time"
                name="labor.officialEntry"
                value={editedReport.labor?.officialEntry || ""}
                onChange={handleInputChange}
                className="time-input"
              />
            </div>
            <div className="labor-field">
              <label>Hora salida oficial</label>
              <input
                type="time"
                name="labor.officialExit"
                value={editedReport.labor?.officialExit || ""}
                onChange={handleInputChange}
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
                onChange={handleInputChange}
                className="time-input"
              />
            </div>
            <div className="labor-field">
              <label>Hora salida peón</label>
              <input
                type="time"
                name="labor.workerExit"
                value={editedReport.labor?.workerExit || ""}
                onChange={handleInputChange}
                className="time-input"
              />
            </div>
          </div>
        </>
      ) : null}

      <h4>Descripción de trabajos</h4>
      <textarea
        name="workPerformed.description"
        value={editedReport.workPerformed?.description || ""}
        onChange={handleInputChange}
        placeholder="Descripción de los trabajos realizados"
      />

      {!isHourlyProject && (
        <>
          <label>Importe Facturado (€)</label>
          <input
            type="number"
            name="workPerformed.invoicedAmount"
            min="0"
            step="0.01"
            value={editedReport.workPerformed?.invoicedAmount || 0}
            onChange={handleInputChange}
          />
        </>
      )}

      {isHourlyProject && (
        <MaterialsEditor
          materials={editedReport.materials || []}
          onMaterialsChange={handleMaterialsChange}
          projectId={editedReport.projectId}
          reportDate={editedReport.reportDate}
          uploadFile={uploadFile}
        />
      )}

      <PhotosEditor
        photos={editedReport.workPerformed?.photos || []}
        onPhotosChange={handlePhotosChange}
        projectId={editedReport.projectId}
        reportDate={editedReport.reportDate}
        uploadFile={uploadFile}
      />

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="cancel-button"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default React.memo(ReportEditForm);