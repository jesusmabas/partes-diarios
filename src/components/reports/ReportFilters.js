import React, { useCallback } from "react";

const ReportFilters = ({ 
  projects, 
  selectedProjectId, 
  dateRange,
  onProjectChange,
  onDateRangeChange
}) => {
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

  return (
    <div className="filter-section">
      <label>Filtrar por Proyecto: </label>
      <select value={selectedProjectId} onChange={handleProjectSelect}>
        <option value="">Todos los proyectos</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.id} - {project.client}
          </option>
        ))}
      </select>

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
    </div>
  );
};

export default React.memo(ReportFilters);