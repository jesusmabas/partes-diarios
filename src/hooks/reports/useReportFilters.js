import { useState, useCallback, useMemo } from "react";

/**
 * Hook personalizado para la gestión de filtros de reportes
 * @param {Object} initialFilters - Filtros iniciales
 * @returns {Object} - Objeto con estados y funciones para gestionar filtros
 */
export const useReportFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState({
    projectId: "",
    startDate: "",
    endDate: "",
    ...initialFilters
  });

  // Actualizar un filtro específico
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Actualizar múltiples filtros a la vez
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Restablecer todos los filtros
  const resetFilters = useCallback(() => {
    setFilters({
      projectId: "",
      startDate: "",
      endDate: "",
    });
  }, []);

  // Filtrar una lista de reportes basándose en los filtros actuales
  const filterReports = useCallback((reports) => {
    if (!Array.isArray(reports)) return [];
    
    return reports.filter(report => {
      // Filtro por proyecto
      if (filters.projectId && report.projectId !== filters.projectId) {
        return false;
      }
      
      // Filtro por fecha de inicio
      if (filters.startDate && report.reportDate) {
        const startDate = new Date(filters.startDate);
        const reportDate = new Date(report.reportDate);
        if (reportDate < startDate) {
          return false;
        }
      }
      
      // Filtro por fecha final
      if (filters.endDate && report.reportDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Incluir todo el día
        const reportDate = new Date(report.reportDate);
        if (reportDate > endDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [filters]);

  // Verifica si hay filtros activos
  const hasActiveFilters = useMemo(() => {
    return filters.projectId !== "" || filters.startDate !== "" || filters.endDate !== "";
  }, [filters.projectId, filters.startDate, filters.endDate]);

  // Crear una cadena de texto que describa los filtros actuales (para uso en mensajes o títulos)
  const filtersDescription = useMemo(() => {
    const parts = [];
    
    if (filters.projectId) {
      parts.push(`Proyecto: ${filters.projectId}`);
    }
    
    if (filters.startDate) {
      parts.push(`Desde: ${new Date(filters.startDate).toLocaleDateString()}`);
    }
    
    if (filters.endDate) {
      parts.push(`Hasta: ${new Date(filters.endDate).toLocaleDateString()}`);
    }
    
    return parts.join(' - ') || 'Sin filtros aplicados';
  }, [filters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    filterReports,
    hasActiveFilters,
    filtersDescription
  };
};

export default useReportFilters;