import React, { useMemo } from "react"; // Importar useMemo
import { useQueryProjects } from "../hooks/useQueryProjects";
import { formatCurrency } from "../utils/calculationUtils"; // Asegúrate que la ruta sea correcta

const ProjectSelector = ({ onProjectSelect, selectedProject }) => {
  // Usamos el hook de React Query para obtener proyectos
  const { data: projects = [], isLoading, error } = useQueryProjects();

  // Ordenar los proyectos alfabéticamente descendente por ID
  // Usamos useMemo para que solo se reordene si la lista de 'projects' cambia
  const sortedProjects = useMemo(() => {
    // Creamos una copia antes de ordenar para no mutar el estado original de React Query
    return [...projects].sort((a, b) => {
      // localeCompare para comparación de strings segura
      // b.id.localeCompare(a.id) para orden descendente
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [projects]); // Dependencia: reordenar solo si 'projects' cambia

  const handleChange = (e) => {
    const selectedProjectId = e.target.value;
    // Buscamos el proyecto usando el ID personalizado
    const project = projects.find((p) => p.id === selectedProjectId);
    onProjectSelect(project); // Pasar el objeto proyecto completo
  };

  if (isLoading) return <p>Cargando proyectos...</p>;
  if (error) return <p className="error-message">Error: {error.message}</p>;

  return (
    <div className="project-selector-container"> {/* Añadido un contenedor si es necesario */}
      <label htmlFor="project-select-main">ID del Proyecto</label>
      <select
        id="project-select-main" // Añadido un ID para el label
        onChange={handleChange}
        value={selectedProject?.id || ""}
        required
        className="project-selector" // Clase para estilos si es necesario
      >
        <option value="">Selecciona un proyecto</option>
        {/* Mapear sobre la lista ordenada */}
        {sortedProjects.map((p) => (
          <option key={p.firestoreId} value={p.id}>
            {/* Mostrar ID y Cliente para mejor identificación */}
            {p.id} - {p.client}
          </option>
        ))}
      </select>

      {/* Detalles del proyecto seleccionado (sin cambios en esta parte) */}
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
                <>
                    <p className="extra-work-info">Este proyecto permite trabajos extra</p>
                    <p>
                        <span className="detail-label">€ Oficial (Extras):</span>
                        <span className="detail-value">{formatCurrency(selectedProject.officialPrice)}/h</span>
                    </p>
                    <p>
                        <span className="detail-label">€ Peón (Extras):</span>
                        <span className="detail-value">{formatCurrency(selectedProject.workerPrice)}/h</span>
                    </p>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ProjectSelector);