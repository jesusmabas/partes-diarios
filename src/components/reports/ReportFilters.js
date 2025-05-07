// src/components/reports/ReportFilters.js
import React, { useCallback, useState, useMemo } from "react"; // Importar useMemo
import { formatCurrency } from "../../utils/calculationUtils";

const ReportFilters = ({
  projects, // Recibe la lista de proyectos como prop
  selectedProjectId,
  dateRange,
  onProjectChange,
  onDateRangeChange,
  onBilledStatusChange,
  billedStatus,
  onWorkTypeChange,
  workType,
  onUserChange,
  selectedUserId,
  users = [],
  onAmountRangeChange,
  amountRange = { min: "", max: "" },
  onSortChange,
  sortField = "reportDate",
  sortDirection = "desc",
  onSaveFilter,
  onResetFilters,
  savedFilters = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Ordenar los proyectos alfabéticamente descendente por ID
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [projects]); // Dependencia: reordenar solo si 'projects' cambia

  // --- Manejadores existentes (sin cambios) ---
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

  const handleSortChangeInternal = useCallback((e) => { // Renombrado para evitar conflicto
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

  const handleApplySavedFilter = useCallback((filterData) => {
      if (onSaveFilter) {
          onSaveFilter(filterData, true); // true indica aplicar
      }
  }, [onSaveFilter]);


  const hasActiveFilters =
    selectedProjectId ||
    dateRange.startDate ||
    dateRange.endDate ||
    billedStatus !== undefined || // Comprobar undefined en lugar de falsy
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
          <label htmlFor="filter-project-select">Proyecto: </label>
          {/* Usar la lista ordenada */}
          <select id="filter-project-select" value={selectedProjectId || ""} onChange={handleProjectSelect}>
            <option value="">Todos los proyectos</option>
            {sortedProjects.map((project) => (
              <option key={project.firestoreId} value={project.id}>
                {project.id} - {project.client}
              </option>
            ))}
          </select>
        </div>

        <div className="date-range">
          <div className="date-field">
            <label htmlFor="filter-startDate">Fecha de inicio:</label>
            <input
              id="filter-startDate"
              type="date"
              name="startDate"
              value={dateRange.startDate || ""}
              onChange={handleDateChange}
            />
          </div>
          <div className="date-field">
            <label htmlFor="filter-endDate">Fecha de fin:</label>
            <input
              id="filter-endDate"
              type="date"
              name="endDate"
              value={dateRange.endDate || ""}
              onChange={handleDateChange}
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-billedStatus">Facturación:</label>
          <select id="filter-billedStatus" value={billedStatus === undefined ? "" : String(billedStatus)} onChange={handleBilledStatusSelect}>
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
              <label htmlFor="filter-workType">Tipo de trabajo:</label>
              <select id="filter-workType" value={workType || ""} onChange={handleWorkTypeSelect}>
                <option value="">Todos los tipos</option>
                <option value="normal">Trabajo normal</option>
                <option value="extra">Trabajo extra (todos)</option>
                <option value="extra_hourly">Extra por horas</option>
                <option value="extra_budget">Extra con presupuesto</option>
              </select>
            </div>

            {users.length > 0 && (
              <div className="filter-group">
                <label htmlFor="filter-user">Usuario:</label>
                <select id="filter-user" value={selectedUserId || ""} onChange={handleUserSelect}>
                  <option value="">Todos los usuarios</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} {/* Mostrar nombre si existe */}
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
                   <label htmlFor="filter-amount-min" className="sr-only">Importe mínimo</label> {/* Label oculto para accesibilidad */}
                  <input
                    id="filter-amount-min"
                    type="number"
                    name="amountmin"
                    placeholder="Mínimo €"
                    value={amountRange.min || ""}
                    onChange={handleAmountChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <span className="amount-separator">a</span>
                <div className="amount-field">
                  <label htmlFor="filter-amount-max" className="sr-only">Importe máximo</label> {/* Label oculto para accesibilidad */}
                  <input
                    id="filter-amount-max"
                    type="number"
                    name="amountmax"
                    placeholder="Máximo €"
                    value={amountRange.max || ""}
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
              <label htmlFor="filter-sortField">Ordenar por:</label>
              <select id="filter-sortField" value={sortField} onChange={handleSortChangeInternal}>
                <option value="reportDate">Fecha</option>
                <option value="invoicedAmount">Importe facturado</option>
                <option value="totalCost">Coste total</option>
                <option value="projectId">Proyecto</option>
                <option value="isBilled">Estado de facturación</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="filter-sortDirection">Dirección:</label>
              <select id="filter-sortDirection" value={sortDirection} onChange={handleSortDirectionChange}>
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
                {savedFilters.map((filterData, index) => (
                  <button
                    key={index}
                    className="saved-filter-button"
                    onClick={() => handleApplySavedFilter(filterData)} // Usar handler específico
                    title={`Aplicar filtro: ${filterData.name}`}
                  >
                    {filterData.name}
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
            {billedStatus !== undefined && ( // Comprobar undefined
              <span className="filter-tag">
                {billedStatus === true ? "Facturados" : "No facturados"}
              </span>
            )}
            {workType && (
              <span className="filter-tag">
                Tipo: {workType === "normal" ? "Normal" : `Extra (${workType.replace('extra_','')})`}
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

// Añadir clase sr-only a tu CSS si no la tienes
/*
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
*/

export default React.memo(ReportFilters);