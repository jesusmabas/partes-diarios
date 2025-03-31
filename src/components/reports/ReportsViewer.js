// src/components/reports/ReportsViewer.js - Actualizado con filtros avanzados
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryProjects } from "../../hooks/useQueryProjects";
import { useQueryUser } from "../../hooks/useQueryUser"; // Nuevo hook para usuarios
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
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Estado para filtrado avanzado
  const [sortConfig, setSortConfig] = useState({
    field: "reportDate",
    direction: "desc" 
  });

  // Hook de filtrado avanzado
  const {
    filters,
    updateFilter,
    updateFilters,
    filterReports,
    hasActiveFilters,
    filtersDescription,
    sortOptions,
    updateSortOptions,
    resetFilters,
    saveFilter,
    savedFilters,
    processReports
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
  
  const { data: users = [], isLoading: usersLoading } = useQueryUser();

  // Consulta de reportes con React Query - usando los filtros nuevos
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    refetch
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

  // Extraer reportes de los datos paginados
  const reports = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.items);
  }, [data]);

  // Aplicar filtros adicionales en el cliente (para los que no soporta Firestore)
  const filteredReports = useMemo(() => {
    // Usar processReports que aplica filtrado y ordenación
    const processed = processReports(reports);
    
    // Aplicar filtrado adicional si es necesario
    return processed.filter(report => {
      // Filtro por rango de importes
      if (filters.amountMin || filters.amountMax) {
        const amount = getReportAmount(report);
        
        if (filters.amountMin && amount < parseFloat(filters.amountMin)) {
          return false;
        }
        
        if (filters.amountMax && amount > parseFloat(filters.amountMax)) {
          return false;
        }
      }
      
      // Filtro por tipo de trabajo específico
      if (filters.workType === 'extra_hourly' && 
          (!report.isExtraWork || report.extraWorkType !== 'hourly')) {
        return false;
      }
      
      if (filters.workType === 'extra_budget' && 
          (!report.isExtraWork || report.extraWorkType !== 'additional_budget')) {
        return false;
      }
      
      return true;
    });
  }, [reports, filters, processReports]);

  // Función auxiliar para obtener el monto relevante de un reporte
  const getReportAmount = (report) => {
    return report.invoicedAmount || 
           report.extraBudgetAmount || 
           report.totalCost || 
           ((report.labor?.totalLaborCost || 0) + (report.totalMaterialsCost || 0)) || 
           0;
  };

  // Usar hook de resumen para calcular totales
  const { totals } = useReportSummary(
    filteredReports,
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
      amountMax: range.max || ""
    });
  }, [updateFilters]);

  const handleSortChange = useCallback((sortData) => {
    updateSortOptions(sortData);
    setSortConfig(sortData);
  }, [updateSortOptions]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setSortConfig({
      field: "reportDate",
      direction: "desc"
    });
  }, [resetFilters]);

  const handleSaveFilter = useCallback((filterData, apply = false) => {
    saveFilter({
      ...filterData,
      apply
    });
    
    if (apply) {
      // Si estamos aplicando un filtro guardado
      const { filter } = filterData;
      updateFilters(filter);
      updateSortOptions(filter.sort || { field: "reportDate", direction: "desc" });
      setSortConfig(filter.sort || { field: "reportDate", direction: "desc" });
    }
  }, [saveFilter, updateFilters, updateSortOptions]);

  // Manejadores para edición y eliminación
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
  }, [handleCancelEdit]);

  const handleDeleteReport = useCallback(async () => {
    if (!reportToDelete) return;

    try {
      await deleteReportMutation.mutateAsync(reportToDelete);
      setReportToDelete(null);
    } catch (error) {
      console.error("Error al eliminar reporte:", error);
    }
  }, [reportToDelete, deleteReportMutation]);

  const handleEditComplete = useCallback(() => {
    setEditingReportId(null);
    refetch();
  }, [refetch]);

  // Estado de carga
  const isLoadingData = isLoading && reports.length === 0;

  return (
    <div className="reports-viewer">
      <h2>Informes</h2>

      {/* Filtros mejorados */}
      <ReportFilters
        projects={projects}
        selectedProjectId={filters.projectId}
        dateRange={{
          startDate: filters.startDate,
          endDate: filters.endDate
        }}
        onProjectChange={handleProjectChange}
        onDateRangeChange={handleDateRangeChange}
        onBilledStatusChange={handleBilledStatusChange}
        billedStatus={filters.isBilled === undefined ? "" : String(filters.isBilled)}
        // Nuevos props para filtros adicionales
        onWorkTypeChange={handleWorkTypeChange}
        workType={filters.workType}
        onUserChange={handleUserChange}
        selectedUserId={filters.userId}
        users={users}
        onAmountRangeChange={handleAmountRangeChange}
        amountRange={{
          min: filters.amountMin,
          max: filters.amountMax
        }}
        // Props para ordenación
        onSortChange={handleSortChange}
        sortField={sortConfig.field}
        sortDirection={sortConfig.direction}
        // Props para UI mejorada
        onSaveFilter={handleSaveFilter}
        onResetFilters={handleResetFilters}
        savedFilters={savedFilters}
      />

      {/* Descripción de filtros activos */}
      {hasActiveFilters && (
        <div className="filters-summary">
          <p>Filtros aplicados: {filtersDescription}</p>
        </div>
      )}

      {/* Resumen de Totales (si hay reportes y se ha seleccionado un proyecto) */}
      {filteredReports.length > 0 && filters.projectId && (
        <ReportSummary
          reports={filteredReports}
          projects={projects}
          selectedProjectId={filters.projectId}
        />
      )}

      {/* Botón para generar PDF (si hay reportes) */}
      <PDFButton
        key={pdfKey}
        reports={filteredReports}
        projects={projects}
        selectedProjectId={filters.projectId}
        dateRange={{
          startDate: filters.startDate,
          endDate: filters.endDate
        }}
        disabled={!filters.projectId || filteredReports.length === 0}
      />

      <h3 className="section-title">Partes en el rango seleccionado:</h3>

      {/* Mostrar estado vacío si no hay reportes */}
      {filteredReports.length === 0 && !isLoadingData ? (
        <EmptyState 
          title="No se encontraron partes"
          message={hasActiveFilters ? 
            "No hay partes que coincidan con los filtros aplicados. Prueba con otros filtros." : 
            "No hay partes creados aún. Crea tu primer parte diario en la sección 'Partes'."
          }
          icon="📊"
          action={hasActiveFilters ? handleResetFilters : null}
          actionLabel={hasActiveFilters ? "Limpiar filtros" : null}
        />
      ) : (
        <>
          {/* Lista de Reportes */}
          <ReportsList
            reports={filteredReports}
            projects={projects}
            onEdit={handleEditReport}
            onDelete={handleDeleteConfirm}
          />

          {/* Cargar más datos si es necesario */}
          {hasNextPage && (
            <div className="load-more-container">
              <button 
                onClick={() => fetchNextPage()} 
                disabled={isLoading}
                className="load-more-button"
              >
                {isLoading ? "Cargando más partes..." : "Cargar más partes"}
              </button>
            </div>
          )}
        </>
      )}

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
          isLoading={deleteReportMutation.isPending}
        />
      )}
    </div>
  );
};

export default React.memo(ReportsViewer);