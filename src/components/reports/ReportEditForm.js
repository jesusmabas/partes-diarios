import React, { useState, useEffect, useCallback } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getWeekNumber } from "../../utils/formatters";
import { useStorage } from "../../hooks/useStorage";
import MaterialsEditor from "./MaterialsEditor";
import PhotosEditor from "./PhotosEditor";

const ReportEditForm = ({ reportId, projects, onCancel, onComplete }) => {
  const [editedReport, setEditedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { uploadFile } = useStorage();

  // Efecto para bloquear scroll cuando el modal está abierto
  useEffect(() => {
    // Función para manejar la tecla Escape
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    // Bloquear scroll cuando el modal se abre
    document.body.classList.add('body-no-scroll');
    
    // Añadir event listener para la tecla Escape
    document.addEventListener('keydown', handleEscKey);
    
    // Limpiar al desmontar
    return () => {
      document.body.classList.remove('body-no-scroll');
      document.removeEventListener('keydown', handleEscKey);
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

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setEditedReport(prev => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editedReport) return;
    
    try {
      setLoading(true);
      const reportRef = doc(db, "dailyReports", reportId);

      // Preparar los datos a actualizar (código similar al original)
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

      // Lógica específica por tipo de proyecto
      const project = projects.find((p) => p.id === editedReport.projectId);
      
      if (editedReport.labor) {
        updatedData.labor = editedReport.labor;
      }

      if (editedReport.workPerformed?.invoicedAmount !== undefined) {
        updatedData.invoicedAmount = editedReport.workPerformed.invoicedAmount;
      }

      if (project && project.type === "hourly") {
        const totalMaterialsCost = editedReport.materials.reduce(
          (sum, m) => sum + (m.cost || 0), 0
        );
        updatedData.totalMaterialsCost = totalMaterialsCost;

        if (editedReport.labor && 
            editedReport.labor.officialHours != null && 
            editedReport.labor.workerHours != null) {
          updatedData.totalCost = (editedReport.labor.totalLaborCost || 0) + totalMaterialsCost;
        }
      }

      await updateDoc(reportRef, updatedData);
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

      {/* Editor de materiales (componente separado) */}
      {isHourlyProject && (
        <MaterialsEditor 
          materials={editedReport.materials || []}
          onMaterialsChange={handleMaterialsChange}
          projectId={editedReport.projectId}
          reportDate={editedReport.reportDate}
          uploadFile={uploadFile}
        />
      )}

      {/* Editor de fotos (componente separado) */}
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