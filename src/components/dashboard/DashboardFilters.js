// src/components/dashboard/DashboardFilters.js
import React, { useCallback } from "react";

/**
 * Componente para filtros del dashboard
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.projects - Lista de proyectos
 * @param {string} props.selectedProject - ID del proyecto seleccionado
 * @param {Object} props.dateRange - Rango de fechas {startDate, endDate}
 * @param {Function} props.onFiltersChange - Función para manejar cambios en filtros
 */
const DashboardFilters = ({ 
  projects, 
  selectedProject, 
  dateRange, 
  onFiltersChange 
}) => {
  // Manejar cambio de proyecto
  const handleProjectChange = useCallback((e) => {
    const newProjectId = e.target.value;
    onFiltersChange({ 
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
        <label htmlFor="project-select">Proyecto:</label>
        <select 
          id="project-select"
          value={selectedProject} 
          onChange={handleProjectChange}
          className="project-selector"
          aria-label="Seleccionar proyecto"
        >
          <option value="all">Todos los proyectos</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.id} - {project.client}
            </option>
          ))}
        </select>
      </div>
      
      {/* Filtro de fechas */}
      <div className="date-range">
        <div className="date-field">
          <label htmlFor="startDate">Fecha inicial:</label>
          <input 
            id="startDate"
            type="date" 
            name="startDate" 
            value={dateRange.startDate} 
            onChange={handleDateChange}
            aria-label="Fecha inicial para filtrar"
          />
        </div>
        <div className="date-field">
          <label htmlFor="endDate">Fecha final:</label>
          <input 
            id="endDate"
            type="date" 
            name="endDate" 
            value={dateRange.endDate} 
            onChange={handleDateChange}
            aria-label="Fecha final para filtrar"
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardFilters);