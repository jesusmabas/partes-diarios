// src/hooks/reports/useReportFilters.js - Hook mejorado con más capacidades
import { useState, useCallback, useMemo, useEffect } from "react";
import { useLocalStorage } from "../useLocalStorage"; // Necesitarás crear este hook

/**
 * Hook personalizado para la gestión de filtros de reportes avanzados
 * @param {Object} initialFilters - Filtros iniciales
 * @returns {Object} - Objeto con estados y funciones para gestionar filtros
 */
export const useReportFilters = (initialFilters = {}) => {
  // Estado para filtros principales
  const [filters, setFilters] = useState({
    projectId: "",
    startDate: "",
    endDate: "",
    isBilled: undefined,
    // Nuevos filtros
    workType: "",
    userId: "",
    amountMin: "",
    amountMax: "",
    ...initialFilters
  });

  // Estado para opciones de ordenación
  const [sortOptions, setSortOptions] = useState({
    field: "reportDate",
    direction: "desc"
  });

  // Persistir filtros guardados en localStorage
  const [savedFilters, setSavedFilters] = useLocalStorage("reportFilters", []);

  // Detectar cambios de URL (si implementamos rutas)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId") || "";
    const startDate = params.get("startDate") || "";
    const endDate = params.get("endDate") || "";
    const isBilled = params.get("isBilled");
    
    // Solo actualizar si hay parámetros en la URL
    if (projectId || startDate || endDate || isBilled !== null) {
      setFilters(prev => ({
        ...prev,
        projectId,
        startDate,
        endDate,
        isBilled: isBilled === "true" ? true : isBilled === "false" ? false : undefined
      }));
    }
  }, []);

  // Actualizar un filtro específico
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));

    // Actualizar URL si es necesario (opcional)
    if (window.history && window.history.pushState) {
      const url = new URL(window.location);
      if (value === "" || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
      window.history.pushState({}, '', url);
    }
  }, []);

  // Actualizar múltiples filtros a la vez
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Actualizar opciones de ordenación
  const updateSortOptions = useCallback(({ field, direction }) => {
    setSortOptions({
      field: field || sortOptions.field,
      direction: direction || sortOptions.direction
    });
  }, [sortOptions]);

  // Restablecer todos los filtros
  const resetFilters = useCallback(() => {
    setFilters({
      projectId: "",
      startDate: "",
      endDate: "",
      isBilled: undefined,
      workType: "",
      userId: "",
      amountMin: "",
      amountMax: ""
    });
    setSortOptions({
      field: "reportDate",
      direction: "desc"
    });

    // Limpiar URL si es necesario
    if (window.history && window.history.pushState) {
      const url = new URL(window.location);
      url.search = "";
      window.history.pushState({}, '', url);
    }
  }, []);

  // Guardar un filtro con nombre
  const saveFilter = useCallback((filterData) => {
    // Si es para aplicar un filtro guardado
    if (filterData.filter && filterData.apply) {
      setFilters(filterData.filter);
      setSortOptions(filterData.filter.sort || { field: "reportDate", direction: "desc" });
      return;
    }

    // Si es para guardar un nuevo filtro
    setSavedFilters(prev => {
      // Verificar si ya existe un filtro con el mismo nombre
      const existingIndex = prev.findIndex(f => f.name === filterData.name);
      if (existingIndex >= 0) {
        // Actualizar filtro existente
        const updated = [...prev];
        updated[existingIndex] = filterData;
        return updated;
      }
      // Añadir nuevo filtro
      return [...prev, filterData];
    });
  }, [setSavedFilters]);

  // Eliminar un filtro guardado
  const deleteFilter = useCallback((filterName) => {
    setSavedFilters(prev => prev.filter(f => f.name !== filterName));
  }, [setSavedFilters]);

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
      
      // Filtro por estado de facturación
      if (filters.isBilled !== undefined) {
        if (filters.isBilled !== !!report.isBilled) {
          return false;
        }
      }
      
      // Filtro por tipo de trabajo
      if (filters.workType) {
        if (filters.workType === 'normal' && report.isExtraWork) {
          return false;
        }
        if (filters.workType === 'extra' && !report.isExtraWork) {
          return false;
        }
        if (filters.workType === 'extra_hourly' && 
            (!report.isExtraWork || report.extraWorkType !== 'hourly')) {
          return false;
        }
        if (filters.workType === 'extra_budget' && 
            (!report.isExtraWork || report.extraWorkType !== 'additional_budget')) {
          return false;
        }
      }
      
      // Filtro por usuario
      if (filters.userId && report.userId !== filters.userId) {
        return false;
      }
      
      // Filtro por rango de importes
      if (filters.amountMin || filters.amountMax) {
        const amount = 
          report.invoicedAmount || 
          report.extraBudgetAmount || 
          report.totalCost || 
          0;
        
        if (filters.amountMin && amount < parseFloat(filters.amountMin)) {
          return false;
        }
        
        if (filters.amountMax && amount > parseFloat(filters.amountMax)) {
          return false;
        }
      }
      
      return true;
    });
  }, [filters]);

  // Ordenar reportes según las opciones actuales
  const sortReports = useCallback((reports) => {
    if (!Array.isArray(reports) || reports.length === 0) return [];
    
    const { field, direction } = sortOptions;
    const sortedReports = [...reports];
    
    sortedReports.sort((a, b) => {
      let valueA, valueB;
      
      // Extraer valores según el campo
      switch (field) {
        case 'reportDate':
          valueA = new Date(a.reportDate || 0).getTime();
          valueB = new Date(b.reportDate || 0).getTime();
          break;
        case 'invoicedAmount':
          valueA = a.invoicedAmount || 0;
          valueB = b.invoicedAmount || 0;
          break;
        case 'totalCost':
          valueA = a.totalCost || 0;
          valueB = b.totalCost || 0;
          break;
        case 'projectId':
          valueA = a.projectId || '';
          valueB = b.projectId || '';
          break;
        case 'isBilled':
          valueA = a.isBilled ? 1 : 0;
          valueB = b.isBilled ? 1 : 0;
          break;
        default:
          valueA = a[field] || 0;
          valueB = b[field] || 0;
      }
      
      // Ordenar según dirección
      if (direction === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    return sortedReports;
  }, [sortOptions]);
  
  // Procesar reportes - aplicar filtros y ordenación
  const processReports = useCallback((reports) => {
    if (!Array.isArray(reports)) return [];
    
    const filtered = filterReports(reports);
    return sortReports(filtered);
  }, [filterReports, sortReports]);

  // Verifica si hay filtros activos
  const hasActiveFilters = useMemo(() => {
    return filters.projectId !== "" || 
           filters.startDate !== "" || 
           filters.endDate !== "" || 
           filters.isBilled !== undefined ||
           filters.workType !== "" ||
           filters.userId !== "" ||
           filters.amountMin !== "" ||
           filters.amountMax !== "";
  }, [filters]);

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
    
    if (filters.isBilled !== undefined) {
      parts.push(filters.isBilled ? 'Facturados' : 'No facturados');
    }
    
    if (filters.workType) {
      parts.push(`Tipo: ${filters.workType}`);
    }
    
    if (filters.userId) {
      parts.push(`Usuario: ${filters.userId}`);
    }
    
    if (filters.amountMin || filters.amountMax) {
      const min = filters.amountMin ? `${filters.amountMin}€` : '0€';
      const max = filters.amountMax ? `${filters.amountMax}€` : 'sin límite';
      parts.push(`Importe: ${min} - ${max}`);
    }
    
    if (sortOptions.field !== 'reportDate' || sortOptions.direction !== 'desc') {
      parts.push(`Ordenado por: ${sortOptions.field} (${sortOptions.direction === 'asc' ? '↑' : '↓'})`);
    }
    
    return parts.join(' · ') || 'Sin filtros aplicados';
  }, [filters, sortOptions]);

  return {
    // Estados
    filters,
    sortOptions,
    savedFilters,
    // Actualizadores
    updateFilter,
    updateFilters,
    updateSortOptions,
    resetFilters,
    // Gestión de filtros guardados
    saveFilter,
    deleteFilter,
    // Procesamiento de reportes
    filterReports,
    sortReports,
    processReports,
    // Metadatos
    hasActiveFilters,
    filtersDescription
  };
};

export default useReportFilters;