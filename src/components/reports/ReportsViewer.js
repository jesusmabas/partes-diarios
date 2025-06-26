// src/components/reports/ReportsViewer.js
import React, { useState, useCallback, useMemo } from "react";
import { useQueryProjects } from "../../hooks/useQueryProjects";
import { useQueryUser } from "../../hooks/useQueryUser";
import {
  useQueryReportsInfinite,
  useDeleteReport,
} from "../../hooks/useQueryReports";
import useReportFilters from "../../hooks/reports/useReportFilters";
import useReportSummary from "../../hooks/reports/useReportSummary";

import ReportFilters from "./ReportFilters";
import ReportsList from "./ReportsList";
import ReportEditForm from "./ReportEditForm";
import ReportDeleteModal from "./ReportDeleteModal";
import ReportSummary from "./ReportSummary";
import PDFButton from "../common/PDFButton";
import EmptyState from "../common/EmptyState";
import './Reports.css';

const ReportsViewer = () => {
  // Estados locales para UI y modales
  const [editingReportId, setEditingReportId] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [pdfKey, setPdfKey] = useState(Date.now());
  
  // Hook de filtrado avanzado
  const {
    filters,
    updateFilter,
    updateFilters,
    processReports, // Usamos la función de procesamiento que filtra y ordena
    hasActiveFilters,
    filtersDescription,
    sortOptions,
    updateSortOptions,
    resetFilters,
    saveFilter,
    savedFilters,
  } = useReportFilters({
    projectId: "",
    startDate: "",
    endDate: "",
    isBilled: undefined,
    workType: "",
    userId: "",
    amountMin: "",
    amountMax: "",
  });

  // Consultar proyectos y usuarios
  const { data: projects = [] } = useQueryProjects();
  const { data: users = [] } = useQueryUser();

  // Consulta de reportes con React Query
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useQueryReportsInfinite({
    projectId: filters.projectId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    isBilled: filters.isBilled,
    userId: filters.userId || undefined,
    orderBy: sortOptions.field,
    orderDirection: sortOptions.direction,
    pageSize: 100,
  });

  // Mutación para eliminar un reporte
  const deleteReportMutation = useDeleteReport();

  // Extraer y procesar reportes
  const allReports = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.items || []);
  }, [data]);

  const filteredAndSortedReports = useMemo(() => {
    return processReports(allReports);
  }, [allReports, processReports]);
  
  // Usar el hook de resumen (ahora corregido) para calcular totales
  // Se le pasa la lista COMPLETA de reportes para que los totales sean siempre correctos
  const { totals } = useReportSummary(
    allReports,
    projects,
    filters.projectId
  );

  // Manejadores para cambios en filtros
  const handleProjectChange = useCallback((projectId) => {
    updateFilter("projectId", projectId);
    setPdfKey(Date.now());
  }, [updateFilter]);

  const handleDateRangeChange = useCallback((newDateRange) => {
    updateFilters({
      startDate: newDateRange.startDate || "",
      endDate: newDateRange.endDate || ""
    });
    setPdfKey(Date.now());
  }, [updateFilters]);
  
  const handleBilledStatusChange = useCallback((status) => {
    updateFilter("isBilled", status === "" ? undefined : status === "true");
  }, [updateFilter]);

  const handleWorkTypeChange = useCallback((type) => {
    updateFilter("workType", type);
  }, [updateFilter]);

  const handleUserChange = useCallback((userId) => {
    updateFilter("userId", userId);
  }, [updateFilter]);

  const handleAmountRangeChange = useCallback((range) => {
    updateFilters({
      amountMin: range.min || "",
      max: range.max || ""
    });
  }, [updateFilters]);

  const handleSortChange = useCallback((sortData) => {
    updateSortOptions(sortData);
  }, [updateSortOptions]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleSaveFilter = useCallback((filterData, apply = false) => {
    saveFilter({ ...filterData, apply });
    if (apply) {
      const { filter } = filterData;
      updateFilters(filter);
      updateSortOptions(filter.sort || { field: "reportDate", direction: "desc" });
    }
  }, [saveFilter, updateFilters, updateSortOptions]);

  // Manejadores para edición y eliminación
  const handleEditReport = useCallback((reportId) => {
    setEditingReportId(reportId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingReportId(null);
  }, []);

  const handleModalOverlayClick = useCallback((e) => {
    if (e.target.className === 'modal-overlay') {
      handleCancelEdit();
    }
  }, [handleCancelEdit]);

  const handleEditComplete = useCallback(() => {
    setEditingReportId(null);
    refetch();
  }, [refetch]);

  const handleDeleteRequest = useCallback((reportId) => {
    setReportToDelete(reportId);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setReportToDelete(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!reportToDelete) return;
    await deleteReportMutation.mutateAsync(reportToDelete);
    setReportToDelete(null);
  }, [reportToDelete, deleteReportMutation]);

  const isLoadingData = isLoading && allReports.length === 0;

  return (
    <div className="reports-viewer">
      <h2>Informes</h2>

      <ReportFilters
        projects={projects}
        selectedProjectId={filters.projectId}
        dateRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onProjectChange={handleProjectChange}
        onDateRangeChange={handleDateRangeChange}
        onBilledStatusChange={handleBilledStatusChange}
        billedStatus={filters.isBilled === undefined ? "" : String(filters.isBilled)}
        onWorkTypeChange={handleWorkTypeChange}
        workType={filters.workType}
        onUserChange={handleUserChange}
        selectedUserId={filters.userId}
        users={users}
        onAmountRangeChange={handleAmountRangeChange}
        amountRange={{ min: filters.amountMin, max: filters.amountMax }}
        onSortChange={handleSortChange}
        sortField={sortOptions.field}
        sortDirection={sortOptions.direction}
        onSaveFilter={handleSaveFilter}
        onResetFilters={handleResetFilters}
        savedFilters={savedFilters}
      />

      {hasActiveFilters && (
        <div className="filters-summary">
          <p>Mostrando resultados para: {filtersDescription}</p>
        </div>
      )}

      {/* --- SECCIÓN DE RESUMEN CORREGIDA --- */}
      {/* Se renderiza si hay un proyecto seleccionado, para mostrar su resumen financiero */}
      {filters.projectId && (
        <ReportSummary
          totals={totals}
          project={projects.find(p => p.id === filters.projectId)}
        />
      )}

      <PDFButton
        key={pdfKey}
        reports={filteredAndSortedReports}
        projects={projects}
        selectedProjectId={filters.projectId}
        dateRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        disabled={!filters.projectId || filteredAndSortedReports.length === 0}
      />

      <h3 className="section-title">Partes Diarios</h3>

      {isLoadingData ? (
        <p>Cargando informes...</p>
      ) : filteredAndSortedReports.length === 0 ? (
        <EmptyState 
          title="No se encontraron partes"
          message={hasActiveFilters ? 
            "No hay partes que coincidan con los filtros aplicados. Prueba a cambiarlos o limpiarlos." : 
            "No hay partes creados aún en este proyecto o rango de fechas."
          }
          icon="📊"
          action={hasActiveFilters ? resetFilters : null}
          actionLabel={hasActiveFilters ? "Limpiar filtros" : null}
        />
      ) : (
        <>
          <ReportsList
            reports={filteredAndSortedReports}
            projects={projects}
            onEdit={handleEditReport}
            onDelete={handleDeleteRequest}
          />
          {hasNextPage && (
            <div className="load-more-container">
              <button 
                onClick={() => fetchNextPage()} 
                disabled={isLoading}
                className="load-more-button"
              >
                {isLoading ? "Cargando más..." : "Cargar más partes"}
              </button>
            </div>
          )}
        </>
      )}

      {editingReportId && (
        <div className="modal-overlay" onClick={handleModalOverlayClick}>
          <div className="custom-modal edit-modal">
            <h3>Editar Parte</h3>
            <button type="button" className="close-button" onClick={handleCancelEdit} aria-label="Cerrar">×</button>
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
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

export default React.memo(ReportsViewer);