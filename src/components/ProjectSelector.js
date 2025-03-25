import React from "react";
import { useQueryProjects } from "../hooks/useQueryProjects";
import { formatCurrency } from "../utils/calculationUtils";

const ProjectSelector = ({ onProjectSelect, selectedProject }) => {
  // Usamos el hook de React Query para obtener proyectos
  const { data: projects = [], isLoading, error } = useQueryProjects();

  const handleChange = (e) => {
    const selectedProjectId = e.target.value; 
    const project = projects.find((p) => p.id === selectedProjectId);
    onProjectSelect(project);
  };

  if (isLoading) return <p>Cargando proyectos...</p>;
  if (error) return <p className="error-message">Error: {error.message}</p>;

  return (
    <div>
      <label>ID del Proyecto</label>
      <select onChange={handleChange} value={selectedProject?.id || ""} required>
        <option value="">Selecciona un proyecto</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.id}</option>
        ))}
      </select>
      {selectedProject && (
        <div>
          <p>Dirección: {selectedProject.address}</p>
          <p>Cliente: {selectedProject.client}</p>
          <p>NIF/NIE: {selectedProject.nifNie}</p>
          {selectedProject.type === "hourly" ? (
            <>
              <p>Precio oficial: {formatCurrency(selectedProject.officialPrice)} /h</p>
              <p>Precio peón: {formatCurrency(selectedProject.workerPrice)} /h</p>
            </>
          ) : (
            <>
              <p>Presupuesto: {formatCurrency(selectedProject.budgetAmount)}</p>
              {selectedProject.allowExtraWork && (
                <p className="extra-work-info">Este proyecto permite trabajos extra</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ProjectSelector);