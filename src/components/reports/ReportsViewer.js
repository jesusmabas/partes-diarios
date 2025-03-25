// src/components/reports/ReportsViewer.js (Completo)
import React, { useState, useCallback, useMemo } from "react";
import { useQueryProjects } from "../../hooks/useQueryProjects";
import {
  useQueryReportsInfinite,
  useDeleteReport,
  // useUpdateReport // Se quita si ya no se usa directamente aquí
} from "../../hooks/useQueryReports";
import useReportFilters from "../../hooks/reports/useReportFilters";  // Importa useReportFilters
import useReportSummary from "../../hooks/reports/useReportSummary";

import ReportFilters from "./ReportFilters";
import ReportsList from "./ReportsList";
import ReportEditForm from "./ReportEditForm";
import ReportDeleteModal from "./ReportDeleteModal";
import ReportSummary from "./ReportSummary";
import PDFButton from "../common/PDFButton";
import './Reports.css';

const ReportsViewer = () => {
  // Estados locales
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editingReportId, setEditingReportId] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [pdfKey, setPdfKey] = useState(Date.now());
  const [billedStatus, setBilledStatus] = useState(""); // Nuevo estado para el filtro de facturación


  // Hooks de React Query
  const { data: projects = [] } = useQueryProjects();

  const {
    filters,
    updateFilter,
    updateFilters, // Usa updateFilters para actualizar varios a la vez
    filterReports,
    hasActiveFilters,
    filtersDescription //Podrías usarlo para un label o algo así
  } = useReportFilters({
    projectId: selectedProjectId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    isBilled: billedStatus === "" ? undefined : billedStatus === "true" // Convertir a booleano o undefined.
  });

  // Consulta de reportes con React Query
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage, // Para paginación infinita
    hasNextPage
  } = useQueryReportsInfinite({  // Usar useQueryReportsInfinite
    projectId: selectedProjectId || undefined, // Usar undefined en lugar de "" para no filtrar
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    orderBy: 'reportDate',
    orderDirection: 'desc',
    isBilled: billedStatus === "" ? undefined : billedStatus === "true", // Filtro isBilled
    pageSize: 100, // Ajusta según sea necesario
  });

  // Mutación para eliminar un reporte
  const deleteReportMutation = useDeleteReport();

  // Extraer reportes de los datos paginados
    const reports = useMemo(() => {
        if (!data) return [];
        return data.pages.flatMap(page => page.items);
    }, [data]);

    const filteredReports = filterReports(reports);

  // Usar hook de resumen para calcular totales
  const { totals } = useReportSummary(
    filteredReports,
    projects,
    selectedProjectId
  );

 // Manejadores para cambios en filtros y acciones
  const handleProjectChange = useCallback((projectId) => {
    setSelectedProjectId(projectId);
    updateFilter("projectId", projectId); // Actualiza el filtro de proyecto
    setPdfKey(Date.now());
  }, [updateFilter]);

  const handleDateRangeChange = useCallback((newDateRange) => {
    setDateRange(newDateRange);
    updateFilters(newDateRange);  // Usa updateFilters para actualizar ambos a la vez
    setPdfKey(Date.now());
  }, [updateFilters]);

  // Nuevo handler para el filtro de estado de facturación
    const handleBilledStatusChange = useCallback((status) => {
        setBilledStatus(status);
        updateFilter("isBilled", status === "" ? undefined : status === "true");
      }, [updateFilter]);


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

    const handleModalOverlayClick = useCallback((e) => {
        if(e.target.className === 'modal-overlay'){
            handleCancelEdit();
        }
    }, [handleCancelEdit])

  const handleDeleteReport = useCallback(async () => {
    if (!reportToDelete) return;

    try {
      await deleteReportMutation.mutateAsync(reportToDelete);
      setReportToDelete(null); // Limpiar el reporte a eliminar
    } catch (error) {
      console.error("Error al eliminar reporte:", error);
    }
  }, [reportToDelete, deleteReportMutation]);

  const handleEditComplete = useCallback(() => {
    setEditingReportId(null); // Cerrar modal
  }, []);

    if (isLoading && reports.length === 0) return <p>Cargando reportes...</p>;
    if (isError) return <p className="error-message">Error: {error?.message}</p>;


  return (
    <div className="reports-viewer">
      <h2>Informes</h2>

      {/* Filtros */}
      <ReportFilters
        projects={projects}
        selectedProjectId={selectedProjectId}
        dateRange={dateRange}
        onProjectChange={handleProjectChange}
        onDateRangeChange={handleDateRangeChange}
        onBilledStatusChange={handleBilledStatusChange} // Pasar el manejador
        billedStatus={billedStatus}                    // Pasar el estado actual
      />

      {/* Resumen de Totales (si hay reportes y se ha seleccionado un proyecto) */}
      {filteredReports.length > 0 && selectedProjectId && (
        <ReportSummary
          reports={filteredReports}
          projects={projects}
          selectedProjectId={selectedProjectId}
        />
      )}

      {/* Botón para generar PDF (si hay reportes) */}
      <PDFButton
        key={pdfKey}
        reports={filteredReports}
        projects={projects}
        selectedProjectId={selectedProjectId}
        dateRange={dateRange}
        disabled={!selectedProjectId || filteredReports.length === 0} // Deshabilitar si no hay proyecto o reportes
      />

      <h3 className="section-title">Partes en el rango seleccionado:</h3>

      {/* Lista de Reportes */}
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

      {/* Modal de confirmación de eliminación */}
      {reportToDelete && (
        <ReportDeleteModal
          onConfirm={handleDeleteReport}
          onCancel={handleDeleteCancel}
          isLoading={deleteReportMutation.isPending} // Pasar estado de carga
        />
      )}
       {/* Paginación (si es necesario) */}
       {hasNextPage && (
          <button onClick={() => fetchNextPage()} disabled={isLoading}>
            Cargar más
          </button>
        )}
    </div>
  );
};

export default React.memo(ReportsViewer);