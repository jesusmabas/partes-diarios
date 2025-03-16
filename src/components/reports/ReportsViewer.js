import React, { useState, useEffect, useCallback, useMemo } from "react";
import useReportActions from "../../hooks/reports/useReportActions";
import useReportFilters from "../../hooks/reports/useReportFilters";
import useReportSummary from "../../hooks/reports/useReportSummary";
import { useProjects } from "../../hooks/useProjects";
import ReportFilters from "./ReportFilters";
import ReportsList from "./ReportsList";
import ReportEditForm from "./ReportEditForm";
import ReportDeleteModal from "./ReportDeleteModal";
import ReportSummary from "./ReportSummary";
import PDFButton from "../common/PDFButton";
import './Reports.css';

const ReportsViewer = () => {
  // Estados locales
  const [reports, setReports] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editingReportId, setEditingReportId] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [pdfKey, setPdfKey] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  // Hooks modulares
  const { 
    deleteReport, 
    updateReport,
    loading: actionLoading, 
    error: actionError,
    fetchReports: fetchReportsAction 
  } = useReportActions();
  
  const {
    filters,
    updateFilter,
    updateFilters,
    filterReports,
    hasActiveFilters
  } = useReportFilters({
    projectId: selectedProjectId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });
  
  // useProjects se mantiene igual
  const { projects } = useProjects();

  // Efecto para cargar reportes al inicio
  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      try {
        const allReports = await fetchReportsAction();
        setReports(allReports || []);
      } catch (error) {
        console.error("Error al cargar reportes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReports();
  }, [fetchReportsAction]);

  // Filtrar reportes basados en los filtros actuales
  const filteredReports = useMemo(() => {
    return filterReports(reports);
  }, [filterReports, reports, filters]);

  // Usar hook de resumen para calcular totales
  const { totals } = useReportSummary(
    filteredReports, 
    projects, 
    selectedProjectId
  );

  // Manejador para cambio de filtro de proyecto
  const handleProjectChange = useCallback((projectId) => {
    setSelectedProjectId(projectId);
    updateFilter("projectId", projectId);
    setPdfKey(Date.now()); 
  }, [updateFilter]);

  // Manejador para cambios en el rango de fechas
  const handleDateRangeChange = useCallback((newDateRange) => {
  setDateRange(newDateRange);
  updateFilters(newDateRange);
  setPdfKey(Date.now()); // Añade esta línea para actualizar la clave cuando cambian las fechas
}, [updateFilters]);

  const handleEditReport = useCallback((reportId) => {
    setEditingReportId(reportId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingReportId(null);
  }, []);

  const handleDeleteConfirm = useCallback((reportId) => {
    setReportToDelete(reportId);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setReportToDelete(null);
  }, []);

  // Función para cerrar el modal al hacer clic en el overlay
  const handleModalOverlayClick = useCallback((e) => {
    // Cerrar solo si se hace clic en el overlay, no en el contenido
    if (e.target.className === 'modal-overlay') {
      handleCancelEdit();
    }
  }, [handleCancelEdit]);

  const handleDeleteReport = useCallback(async () => {
    if (reportToDelete) {
      setIsLoading(true);
      try {
        const success = await deleteReport(reportToDelete);
        if (success) {
          setReportToDelete(null);
          // Recargar los reportes después de eliminar
          const updatedReports = await fetchReportsAction();
          setReports(updatedReports || []);
        }
      } catch (error) {
        console.error("Error al eliminar reporte:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [reportToDelete, deleteReport, fetchReportsAction]);

  const handleEditComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      const updatedReports = await fetchReportsAction();
      setReports(updatedReports || []);
      setEditingReportId(null);
    } catch (error) {
      console.error("Error al actualizar reportes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchReportsAction]);

  if (isLoading && reports.length === 0) return <p>Cargando reportes...</p>;
  if (actionError) return <p className="error-message">Error: {actionError}</p>;

  return (
    <div className="reports-viewer">
      <h2>Informes</h2>

      <ReportFilters
        projects={projects}
        selectedProjectId={selectedProjectId}
        dateRange={dateRange}
        onProjectChange={handleProjectChange}
        onDateRangeChange={handleDateRangeChange}
      />

      {filteredReports.length > 0 && selectedProjectId && (
        <ReportSummary 
          reports={filteredReports} 
          projects={projects}
          selectedProjectId={selectedProjectId}
        />
      )}

      <PDFButton 
        key={pdfKey}
        reports={filteredReports}
        projects={projects}
        selectedProjectId={selectedProjectId}
        dateRange={dateRange}
        disabled={!selectedProjectId || filteredReports.length === 0}
      />

      <h3 className="section-title">Partes en el rango seleccionado:</h3>

      <ReportsList
        reports={filteredReports}
        projects={projects}
        onEdit={handleEditReport}
        onDelete={handleDeleteConfirm}
      />
      
      {/* Modal de edición de reportes */}
      {editingReportId && (
  <div className="modal-overlay" onClick={handleModalOverlayClick}>
    <div className="custom-modal edit-modal">
      <h3>Editar Parte</h3>
      <button 
        type="button" 
        className="close-button" 
        onClick={handleCancelEdit}
        aria-label="Cerrar formulario"
      >
        ×
      </button>
      <ReportEditForm
        reportId={editingReportId}
        projects={projects}
        onCancel={handleCancelEdit}
        onComplete={handleEditComplete}
      />
    </div>
  </div>
)}
      
      {reportToDelete && (
        <ReportDeleteModal
          onConfirm={handleDeleteReport}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

export default React.memo(ReportsViewer);