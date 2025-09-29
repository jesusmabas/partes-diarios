import React, { useState, useMemo, useCallback } from "react";
import { useQueryProjects } from "../../hooks/useQueryProjects";
import { useQueryUser } from "../../hooks/useQueryUser";
import { useQueryReportsInfinite, useDeleteReport } from "../../hooks/useQueryReports";
import { useReportFilters } from "../../hooks/reports/useReportFilters";
import { useReportSummary } from "../../hooks/reports/useReportSummary";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import ReportFilters from "./ReportFilters";
import ReportSummary from "./ReportSummary";
import ReportsList from "./ReportsList";
import ReportEditForm from "./ReportEditForm";
import ReportDeleteModal from "./ReportDeleteModal";
import PDFButton from "../common/PDFButton";
import EmptyState from "../common/EmptyState";
import ErrorDisplay from "../common/ErrorDisplay";
import "./Reports.css";

const ReportsViewer = () => {
  const [editingReportId, setEditingReportId] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [pdfKey, setPdfKey] = useState(Date.now());
  const [isLoadingAllReports, setIsLoadingAllReports] = useState(false);

  // Filtros
  const {
    filters,
    updateFilter,
    updateFilters,
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
    amountMax: ""
  });

  // Datos
  const { data: projects = [] } = useQueryProjects();
  const { data: users = [] } = useQueryUser();

  // Query infinito con pageSize de 20 para mejor rendimiento
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useQueryReportsInfinite({
    pageSize: 20,
    projectId: filters.projectId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    isBilled: filters.isBilled,
    userId: filters.userId
  });

  const deleteReportMutation = useDeleteReport();

  // Combinar todas las páginas de reportes
  const allReports = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.items || []);
  }, [data]);

  // Aplicar filtros y ordenación
  const filteredAndSortedReports = useMemo(() => {
    return processReports(allReports);
  }, [allReports, processReports]);

  // Calcular totales
  const { totals } = useReportSummary(
    filteredAndSortedReports,
    projects,
    filters.projectId
  );

  // Encontrar proyecto seleccionado
  const selectedProjectObject = useMemo(() => {
    return projects.find(p => p.id === filters.projectId) || null;
  }, [projects, filters.projectId]);

  // Función para cargar TODOS los reportes (para PDF)
  const loadAllReports = useCallback(async () => {
    if (!hasNextPage) return; // Ya están todos cargados

    setIsLoadingAllReports(true);
    try {
      // Cargar todas las páginas restantes
      let hasMore = hasNextPage;
      while (hasMore) {
        const result = await fetchNextPage();
        hasMore = result.hasNextPage;
        // Pequeña pausa para no saturar Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log(`Todos los reportes cargados: ${allReports.length} total`);
    } catch (error) {
      console.error('Error cargando todos los reportes:', error);
      throw error;
    } finally {
      setIsLoadingAllReports(false);
    }
  }, [hasNextPage, fetchNextPage, allReports.length]);

  // Hook de scroll infinito
  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage && !isLoadingAllReports) {
        fetchNextPage();
      }
    },
    hasNextPage,
    isFetchingNextPage || isLoadingAllReports,
    300
  );

  // Handlers
  const handleProjectChange = useCallback((projectId) => {
    updateFilter("projectId", projectId);
    setPdfKey(Date.now());
  }, [updateFilter]);

  const handleDateRangeChange = useCallback((newDateRange) => {
    updateFilters({
      startDate: newDateRange.startDate,
      endDate: newDateRange.endDate
    });
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
      amountMin: range.min,
      amountMax: range.max
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
      const filter = filterData.filter || filterData;
      updateFilters(filter);
      updateSortOptions(filter.sort || { field: "reportDate", direction: "desc" });
    }
  }, [saveFilter, updateFilters, updateSortOptions]);

  const handleEditReport = useCallback((reportId) => {
    setEditingReportId(reportId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingReportId(null);
  }, []);

  const handleModalOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
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
    try {
      await deleteReportMutation.mutateAsync(reportToDelete);
      setReportToDelete(null);
    } catch (err) {
      console.error("Error al eliminar reporte:", err);
      alert(`Error al eliminar: ${err.message}`);
    }
  }, [reportToDelete, deleteReportMutation]);

  // Estados de carga y error
  if (error) {
    return (
      <div className="reports-viewer">
        <ErrorDisplay
          error={error}
          message="Error al cargar los reportes"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading && allReports.length === 0) {
    return (
      <div className="reports-viewer">
        <div className="loading-indicator">
          <p>Cargando reportes...</p>
        </div>
      </div>
    );
  }

  const showReports = filteredAndSortedReports.length > 0;

  return (
    <div className="reports-viewer">
      <h2>Informes de Trabajo</h2>

      {/* Filtros */}
      <ReportFilters
        projects={projects}
        users={users}
        selectedProjectId={filters.projectId}
        dateRange={{
          startDate: filters.startDate,
          endDate: filters.endDate
        }}
        billedStatus={filters.isBilled === undefined ? "" : String(filters.isBilled)}
        workType={filters.workType}
        selectedUserId={filters.userId}
        amountRange={{
          min: filters.amountMin,
          max: filters.amountMax
        }}
        sortOptions={{
          field: filters.sortField || "reportDate",
          direction: filters.sortDirection || "desc"
        }}
        savedFilters={savedFilters}
        onProjectChange={handleProjectChange}
        onDateRangeChange={handleDateRangeChange}
        onBilledStatusChange={handleBilledStatusChange}
        onWorkTypeChange={handleWorkTypeChange}
        onUserChange={handleUserChange}
        onAmountRangeChange={handleAmountRangeChange}
        onSortChange={handleSortChange}
        onResetFilters={handleResetFilters}
        onSaveFilter={handleSaveFilter}
      />

      {/* Resumen y PDF */}
      {showReports && selectedProjectObject && (
        <>
          <ReportSummary
            totals={totals}
            project={selectedProjectObject}
          />

          <PDFButton
            key={pdfKey}
            reports={filteredAndSortedReports}
            projects={projects}
            selectedProjectId={filters.projectId}
            onLoadAllReports={loadAllReports}
            hasMoreReports={hasNextPage}
            isLoadingAll={isLoadingAllReports}
          />
        </>
      )}

      {/* Lista de reportes */}
      {showReports ? (
        <>
          <div className="reports-count">
            Mostrando {filteredAndSortedReports.length} reportes
            {hasNextPage && " (hay más, haz scroll para cargar)"}
          </div>
          
          <ReportsList
            reports={filteredAndSortedReports}
            projects={projects}
            onEdit={handleEditReport}
            onDelete={handleDeleteRequest}
          />

          {/* Elemento sentinel para scroll infinito */}
          <div ref={sentinelRef} className="scroll-sentinel">
            {(isFetchingNextPage || isLoadingAllReports) && (
              <div className="loading-more">
                <div className="spinner"></div>
                <p>
                  {isLoadingAllReports 
                    ? "Cargando todos los reportes para PDF..." 
                    : "Cargando más reportes..."
                  }
                </p>
              </div>
            )}
          </div>

          {/* Botón manual como fallback */}
          {hasNextPage && !isFetchingNextPage && !isLoadingAllReports && (
            <div className="load-more-container">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="load-more-button"
              >
                Cargar más reportes
              </button>
            </div>
          )}

          {/* Mensaje de final */}
          {!hasNextPage && allReports.length > 20 && (
            <div className="end-of-list">
              <p>Has visto todos los reportes ({allReports.length} total)</p>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No hay reportes"
          message={
            filters.projectId
              ? "No hay reportes para este proyecto con los filtros seleccionados"
              : "No hay reportes que coincidan con los filtros seleccionados"
          }
          action={handleResetFilters}
          actionLabel="Limpiar filtros"
        />
      )}

      {/* Modal de edición */}
      {editingReportId && (
        <div className="modal-overlay" onClick={handleModalOverlayClick}>
          <div className="edit-modal">
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
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

export default React.memo(ReportsViewer);