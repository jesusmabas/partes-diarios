// src/components/reports/ReportFilters.js (Completo)
import React, { useCallback } from "react";

const ReportFilters = ({
  projects,
  selectedProjectId,
  dateRange,
  onProjectChange,
  onDateRangeChange,
  onBilledStatusChange, // NUEVO: Prop para manejar el cambio de estado de facturación
  billedStatus         // NUEVO: Prop para el estado actual de facturación
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

  // NUEVO: Manejador para el cambio de estado de facturación
  const handleBilledStatusSelect = useCallback((e) => {
    onBilledStatusChange(e.target.value);
  }, [onBilledStatusChange]);

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

      {/* NUEVO: Filtro para el estado de facturación */}
      <div className="filter-group">
        <label>Estado de facturación:</label>
        <select value={billedStatus} onChange={handleBilledStatusSelect}>
          <option value="">Todos</option>
          <option value="true">Facturados</option>
          <option value="false">No facturados</option>
        </select>
      </div>
    </div>
  );
};

export default React.memo(ReportFilters);