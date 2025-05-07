// src/components/dashboard/DashboardFilters.js
import React, { useCallback, useMemo } from "react"; // Importar useMemo

/**
 * Componente para filtros del dashboard
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProject - ID del proyecto seleccionado ("all" o un ID específico)
 * @param {Object} props.dateRange - Rango de fechas {startDate, endDate}
 * @param {Function} props.onFiltersChange - Función para manejar cambios en filtros
 */
const DashboardFilters = ({
  projects,
  selectedProject, // Puede ser "all" o un ID
  dateRange,
  onFiltersChange
}) => {

  // Ordenar los proyectos alfabéticamente descendente por ID
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [projects]); // Dependencia: reordenar solo si 'projects' cambia

  // Manejar cambio de proyecto
  const handleProjectChange = useCallback((e) => {
    const newProjectId = e.target.value;
    onFiltersChange({
      // Pasar "" si es "all", o el ID si es un proyecto específico
      projectId: newProjectId !== "all" ? newProjectId : ""
    });
  }, [onFiltersChange]);

  // Manejar cambio en fechas
  const handleDateChange = useCallback((e) => {
    const { name, value } = e.target;
    onFiltersChange({ [name]: value });
  }, [onFiltersChange]);

  return (
    <div className="dashboard-filter" role="search">
      <h3>Filtros</h3>

      {/* Selector de proyecto */}
      <div className="filter-group">
        <label htmlFor="project-select-dashboard">Proyecto:</label>
        {/* Usar la lista ordenada */}
        <select
          id="project-select-dashboard"
          // El valor debe ser "all" si no hay un ID específico
          value={selectedProject || "all"}
          onChange={handleProjectChange}
          className="project-selector"
          aria-label="Seleccionar proyecto"
        >
          <option value="all">Todos los proyectos</option>
          {sortedProjects.map(project => (
            <option key={project.firestoreId} value={project.id}>
              {project.id} - {project.client}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro de fechas */}
      <div className="date-range">
        <div className="date-field">
          <label htmlFor="startDate-dashboard">Fecha inicial:</label>
          <input
            id="startDate-dashboard"
            type="date"
            name="startDate"
            value={dateRange.startDate || ""} // Controlar valor undefined/null
            onChange={handleDateChange}
            aria-label="Fecha inicial para filtrar"
          />
        </div>
        <div className="date-field">
          <label htmlFor="endDate-dashboard">Fecha final:</label>
          <input
            id="endDate-dashboard"
            type="date"
            name="endDate"
            value={dateRange.endDate || ""} // Controlar valor undefined/null
            onChange={handleDateChange}
            aria-label="Fecha final para filtrar"
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardFilters);