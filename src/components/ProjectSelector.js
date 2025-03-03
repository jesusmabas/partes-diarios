import React from "react";
import { useProjects } from "../hooks/useProjects";

const ProjectSelector = ({ onProjectSelect, selectedProject }) => {
  const { projects, loading, error } = useProjects();

  const handleChange = (e) => {
    const selectedProjectId = e.target.value; // Mejor legibilidad
    const project = projects.find((p) => p.id === selectedProjectId);
    onProjectSelect(project);
  };

  if (loading) return <p>Cargando proyectos...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

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
          {/* SÓLO MUESTRA PRECIOS SI ES POR HORAS */}
          {selectedProject.type === "hourly" && (
            <>
              <p>Precio oficial: {selectedProject.officialPrice} €/h</p>
              <p>Precio peón: {selectedProject.workerPrice} €/h</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ProjectSelector);