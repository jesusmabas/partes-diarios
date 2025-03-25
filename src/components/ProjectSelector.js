import React from "react";
import { useQueryProjects } from "../hooks/useQueryProjects";
import { formatCurrency } from "../utils/calculationUtils";

const ProjectSelector = ({ onProjectSelect, selectedProject }) => {
  // Usamos el hook de React Query para obtener proyectos
  const { data: projects = [], isLoading, error } = useQueryProjects();

  const handleChange = (e) => {
    const selectedProjectId = e.target.value; 
    // MODIFICADO: Buscamos el proyecto usando el ID personalizado, no el firestoreId
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
          <option key={p.firestoreId} value={p.id}>{p.id}</option>
        ))}
      </select>
      {selectedProject && (
  <div className="project-details">
    <h4 className="project-details-title">Detalles del Proyecto</h4>
    <p>
      <span className="detail-label">Dirección:</span>
      <span className="detail-value">{selectedProject.address}</span>
    </p>
    <p>
      <span className="detail-label">Cliente:</span>
      <span className="detail-value">{selectedProject.client}</span>
    </p>
    <p>
      <span className="detail-label">NIF/NIE:</span>
      <span className="detail-value">{selectedProject.nifNie}</span>
    </p>
    {selectedProject.type === "hourly" ? (
      <>
        <p>
          <span className="detail-label">Precio oficial:</span>
          <span className="detail-value">{formatCurrency(selectedProject.officialPrice)} /h</span>
        </p>
        <p>
          <span className="detail-label">Precio peón:</span>
          <span className="detail-value">{formatCurrency(selectedProject.workerPrice)} /h</span>
        </p>
      </>
    ) : (
      <>
        <p>
          <span className="detail-label">Presupuesto:</span>
          <span className="detail-value">{formatCurrency(selectedProject.budgetAmount)}</span>
        </p>
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