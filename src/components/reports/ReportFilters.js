// src/components/reports/ReportFilters.js - Componente mejorado con más filtros
import React, { useCallback, useState } from "react";
import { formatCurrency } from "../../utils/calculationUtils";

const ReportFilters = ({
  projects,
  selectedProjectId,
  dateRange,
  onProjectChange,
  onDateRangeChange,
  onBilledStatusChange,
  billedStatus,
  // Nuevos props para filtros adicionales
  onWorkTypeChange,
  workType,
  onUserChange,
  selectedUserId,
  users = [], // Lista de usuarios (opcional)
  onAmountRangeChange,
  amountRange = { min: "", max: "" },
  // Ordenación
  onSortChange,
  sortField = "reportDate",
  sortDirection = "desc",
  // Props para UI mejorada
  onSaveFilter,
  onResetFilters,
  savedFilters = []
}) => {
  // Estado para controlar panel de filtros expandible
  const [isExpanded, setIsExpanded] = useState(false);

  // Manejadores existentes
  const handleProjectSelect = useCallback((e) => {
    onProjectChange(e.target.value);
  }, [onProjectChange]);

  const handleDateChange = useCallback((e) => {
    const { name, value } = e.target;
    onDateRangeChange({
      ...dateRange,
      [name]: value
    });
  }, [dateRange, onDateRangeChange]);

  const handleBilledStatusSelect = useCallback((e) => {
    onBilledStatusChange(e.target.value);
  }, [onBilledStatusChange]);

  // Nuevos manejadores
  const handleWorkTypeSelect = useCallback((e) => {
    if (onWorkTypeChange) {
      onWorkTypeChange(e.target.value);
    }
  }, [onWorkTypeChange]);

  const handleUserSelect = useCallback((e) => {
    if (onUserChange) {
      onUserChange(e.target.value);
    }
  }, [onUserChange]);

  const handleAmountChange = useCallback((e) => {
    const { name, value } = e.target;
    if (onAmountRangeChange) {
      onAmountRangeChange({
        ...amountRange,
        [name.replace("amount", "")]: value
      });
    }
  }, [amountRange, onAmountRangeChange]);

  const handleSortChange = useCallback((e) => {
    if (onSortChange) {
      onSortChange({
        field: e.target.value,
        direction: sortDirection
      });
    }
  }, [onSortChange, sortDirection]);

  const handleSortDirectionChange = useCallback((e) => {
    if (onSortChange) {
      onSortChange({
        field: sortField,
        direction: e.target.value
      });
    }
  }, [onSortChange, sortField]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const handleSaveCurrentFilter = () => {
    if (onSaveFilter) {
      const filterName = prompt("Nombre para guardar este filtro:");
      if (filterName) {
        onSaveFilter({
          name: filterName,
          filter: {
            projectId: selectedProjectId,
            dateRange,
            billedStatus,
            workType,
            selectedUserId,
            amountRange,
            sort: { field: sortField, direction: sortDirection }
          }
        });
      }
    }
  };

  const handleReset = () => {
    if (onResetFilters) {
      onResetFilters();
    }
  };

  // Verificar si hay filtros activos para resaltar
  const hasActiveFilters = 
    selectedProjectId || 
    dateRange.startDate || 
    dateRange.endDate || 
    billedStatus || 
    workType || 
    selectedUserId || 
    amountRange.min || 
    amountRange.max;

  return (
    <div className={`filter-section ${hasActiveFilters ? 'has-active-filters' : ''}`}>
      <div className="filter-header">
        <h3>Filtros</h3>
        <div className="filter-actions">
          <button 
            type="button" 
            className="filter-action-button"
            onClick={toggleExpand}
          >
            {isExpanded ? 'Contraer filtros' : 'Expandir filtros'}
          </button>
          <button 
            type="button" 
            className="filter-action-button save-button"
            onClick={handleSaveCurrentFilter}
            disabled={!hasActiveFilters}
          >
            Guardar filtro
          </button>
          <button 
            type="button" 
            className="filter-action-button reset-button"
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Filtros básicos siempre visibles */}
      <div className="basic-filters">
        <div className="filter-group">
          <label>Proyecto: </label>
          <select value={selectedProjectId} onChange={handleProjectSelect}>
            <option value="">Todos los proyectos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.id} - {project.client}
              </option>
            ))}
          </select>
        </div>

        <div className="date-range">
          <div className="date-field">
            <label>Fecha de inicio:</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
            />
          </div>
          <div className="date-field">
            <label>Fecha de fin:</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Facturación:</label>
          <select value={billedStatus} onChange={handleBilledStatusSelect}>
            <option value="">Todos</option>
            <option value="true">Facturados</option>
            <option value="false">No facturados</option>
          </select>
        </div>
      </div>

      {/* Filtros avanzados (expandibles) */}
      {isExpanded && (
        <div className="advanced-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Tipo de trabajo:</label>
              <select value={workType || ""} onChange={handleWorkTypeSelect}>
                <option value="">Todos los tipos</option>
                <option value="normal">Trabajo normal</option>
                <option value="extra">Trabajo extra</option>
                <option value="extra_hourly">Extra por horas</option>
                <option value="extra_budget">Extra con presupuesto</option>
              </select>
            </div>
            
            {users.length > 0 && (
              <div className="filter-group">
                <label>Usuario:</label>
                <select value={selectedUserId || ""} onChange={handleUserSelect}>
                  <option value="">Todos los usuarios</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="filter-row">
            <div className="filter-group amount-range">
              <label>Rango de importes:</label>
              <div className="amount-inputs">
                <div className="amount-field">
                  <input
                    type="number"
                    name="amountmin"
                    placeholder="Mínimo €"
                    value={amountRange.min}
                    onChange={handleAmountChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <span className="amount-separator">a</span>
                <div className="amount-field">
                  <input
                    type="number"
                    name="amountmax"
                    placeholder="Máximo €"
                    value={amountRange.max}
                    onChange={handleAmountChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="filter-row sorting-options">
            <div className="filter-group">
              <label>Ordenar por:</label>
              <select value={sortField} onChange={handleSortChange}>
                <option value="reportDate">Fecha</option>
                <option value="invoicedAmount">Importe facturado</option>
                <option value="totalCost">Coste total</option>
                <option value="projectId">Proyecto</option>
                <option value="isBilled">Estado de facturación</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Dirección:</label>
              <select value={sortDirection} onChange={handleSortDirectionChange}>
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </div>
          </div>

          {/* Sección de filtros guardados */}
          {savedFilters.length > 0 && (
            <div className="saved-filters">
              <h4>Filtros guardados</h4>
              <div className="saved-filters-list">
                {savedFilters.map((filter, index) => (
                  <button
                    key={index}
                    className="saved-filter-button"
                    onClick={() => onSaveFilter(filter, true)} // true indica que es para aplicar, no guardar
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Indicador de filtros activos */}
      {hasActiveFilters && (
        <div className="active-filters-indicator">
          <p>Filtros activos: </p>
          <div className="active-filter-tags">
            {selectedProjectId && (
              <span className="filter-tag">
                Proyecto: {projects.find(p => p.id === selectedProjectId)?.client || selectedProjectId}
              </span>
            )}
            {dateRange.startDate && (
              <span className="filter-tag">
                Desde: {new Date(dateRange.startDate).toLocaleDateString()}
              </span>
            )}
            {dateRange.endDate && (
              <span className="filter-tag">
                Hasta: {new Date(dateRange.endDate).toLocaleDateString()}
              </span>
            )}
            {billedStatus && (
              <span className="filter-tag">
                {billedStatus === "true" ? "Facturados" : "No facturados"}
              </span>
            )}
            {workType && (
              <span className="filter-tag">
                Tipo: {workType === "normal" ? "Normal" : "Extra"}
              </span>
            )}
            {selectedUserId && (
              <span className="filter-tag">
                Usuario: {users.find(u => u.id === selectedUserId)?.name || selectedUserId}
              </span>
            )}
            {(amountRange.min || amountRange.max) && (
              <span className="filter-tag">
                Importe: {amountRange.min ? formatCurrency(amountRange.min) : "0€"} - 
                {amountRange.max ? formatCurrency(amountRange.max) : "sin límite"}
              </span>
            )}
            {(sortField !== "reportDate" || sortDirection !== "desc") && (
              <span className="filter-tag">
                Ordenado por: {sortField} ({sortDirection === "asc" ? "↑" : "↓"})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ReportFilters);