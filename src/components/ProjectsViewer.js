import React, { useState, useCallback, useEffect } from "react";
import { useProjects } from "../hooks/useProjects";
import { formatCurrency } from "../utils/formatters";
import useReportActions from "../hooks/reports/useReportActions";

const ProjectsViewer = () => {
  const { projects, loading, error, addProject, updateProject, deleteProject } = useProjects();
  const [reports, setReports] = useState([]);
  const { fetchReports, loading: reportsLoading, error: reportsError } = useReportActions();
  const [newProject, setNewProject] = useState({ id: "", client: "", address: "", nifNie: "", officialPrice: 0, workerPrice: 0, type: "hourly", budgetAmount: 0 });
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editedProject, setEditedProject] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Cargar reportes al iniciar el componente
  useEffect(() => {
    const loadReports = async () => {
      try {
        const fetchedReports = await fetchReports();
        setReports(fetchedReports || []);
      } catch (err) {
        console.error("Error al cargar reportes:", err);
      }
    };
    loadReports();
  }, [fetchReports]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    if (editingProjectId) {
      setEditedProject((prev) => ({ ...prev, [name]: name === "officialPrice" || name === "workerPrice" || name === "budgetAmount" ? parseFloat(value) || 0 : value }));
    } else {
      setNewProject((prev) => ({ ...prev, [name]: name === "officialPrice" || name === "workerPrice" || name === "budgetAmount" ? parseFloat(value) || 0 : value }));
    }
  }, [editingProjectId]);

  const handleTypeChange = useCallback((e) => {
    if (editingProjectId) {
      setEditedProject((prev) => ({ ...prev, type: e.target.value, officialPrice: e.target.value === "hourly" ? prev.officialPrice : 0, workerPrice: e.target.value === "hourly" ? prev.workerPrice : 0 }));
    } else {
      setNewProject((prev) => ({ ...prev, type: e.target.value, officialPrice: e.target.value === "hourly" ? prev.officialPrice : 0, workerPrice: e.target.value === "hourly" ? prev.workerPrice : 0 }));
    }
  }, [editingProjectId]);

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.id || !newProject.client || !newProject.address || !newProject.nifNie || !newProject.type) {
      setErrorMessage("Por favor, completa todos los campos requeridos (ID, Cliente, Dirección, NIF/NIE, Tipo).");
      setSuccessMessage("");
      return;
    }

    try {
      // Crear una copia del proyecto con el ID recortado
      const trimmedProject = {
        ...newProject,
        id: newProject.id.trim()
      };
      await addProject(trimmedProject);  // Usamos la función del hook
      setNewProject({ id: "", client: "", address: "", nifNie: "", officialPrice: 0, workerPrice: 0, type: "hourly", budgetAmount: 0 });
      setSuccessMessage("Proyecto añadido correctamente!");
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(`Error al añadir proyecto: ${err.message}`);
    }
  };

  const startEditing = (project) => {
    setEditingProjectId(project.id);
    setEditedProject({ ...project });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editedProject.id || !editedProject.client || !editedProject.address || !editedProject.nifNie || !editedProject.type) {
      setErrorMessage("Por favor, completa todos los campos requeridos (ID, Cliente, Dirección, NIF/NIE, Tipo).");
      return;
    }

    try {
      await updateProject(editedProject.id, editedProject); // Usamos la función del hook
      setEditingProjectId(null);
      setEditedProject(null);
      setSuccessMessage("Proyecto actualizado correctamente!");
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(`Error al actualizar proyecto: ${err.message}`);
    }
  };

  const handleDelete = async (projectId) => {
    console.log("handleDelete llamado con projectId:", projectId);
    if (!window.confirm("¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.")) {
      console.log("Eliminación cancelada por el usuario");
      return;
    }

    try {
      console.log("Intentando eliminar proyecto:", projectId);
      await deleteProject(projectId); // Usamos la función del hook
      setSuccessMessage("Proyecto eliminado correctamente!");
      setErrorMessage(""); // Limpiar errores anteriores
    } catch (err) {
      console.error("Error en handleDelete:", err);
      setErrorMessage(`Error al eliminar proyecto: ${err.message}`);
      setSuccessMessage(""); // Limpiar mensaje de éxito si hay error
    }
  };

  const calculateProjectCosts = (projectId, projectType) => {
    if (projectType !== "hourly") return { laborCost: 0, materialsCost: 0, totalCost: 0 };
    const projectReports = reports.filter((report) => report.projectId === projectId);
    let laborCost = 0;
    let materialsCost = 0;

    projectReports.forEach((report) => {
      laborCost += report.labor?.totalLaborCost || 0;
      materialsCost += report.totalMaterialsCost || 0;
    });

    return {
      laborCost,
      materialsCost,
      totalCost: laborCost + materialsCost,
    };
  };

  const calculateInvoicedTotal = (projectId) => {
    const projectReports = reports.filter((report) => report.projectId === projectId && report.invoicedAmount);
    return projectReports.reduce((sum, report) => sum + (report.invoicedAmount || 0), 0);
  };

  // Mostrar indicador de carga si estamos esperando proyectos o reportes
  if (loading || (reportsLoading && reports.length === 0)) return <p>Cargando proyectos...</p>;
  
  // Mostrar error si hay alguno
  if (error || reportsError) return <p className="error-message">Error: {error || reportsError}</p>;

  return (
    <div className="projects-viewer">
      <h2>Proyectos</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      <form onSubmit={handleAddProject} className="project-form">
        <input
          type="text"
          name="id"
          placeholder="ID del proyecto"
          value={newProject.id}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="client"
          placeholder="Cliente"
          value={newProject.client}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="address"
          placeholder="Dirección"
          value={newProject.address}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="nifNie"
          placeholder="NIF/NIE"
          value={newProject.nifNie}
          onChange={handleInputChange}
        />
        <select name="type" value={newProject.type} onChange={handleTypeChange}>
          <option value="hourly">Por horas</option>
          <option value="fixed">Presupuesto cerrado</option>
        </select>
        {newProject.type === "hourly" ? (
          <>
            <input
              type="number"
              name="officialPrice"
              placeholder="Precio oficial (€/h)"
              value={newProject.officialPrice}
              onChange={handleInputChange}
              min="0"
              step="0.01"
            />
            <input
              type="number"
              name="workerPrice"
              placeholder="Precio peón (€/h)"
              value={newProject.workerPrice}
              onChange={handleInputChange}
              min="0"
              step="0.01"
            />
          </>
        ) : (
          <input
            type="number"
            name="budgetAmount"
            placeholder="Importe presupuestado (€)"
            value={newProject.budgetAmount}
            onChange={handleInputChange}
            min="0"
            step="0.01"
          />
        )}
        <button type="submit" disabled={loading}>
          {loading ? "Añadiendo..." : "Añadir proyecto"}
        </button>
      </form>

      <div className="projects-list">
        {projects.map((project) => {
          const costs = calculateProjectCosts(project.id, project.type);
          const invoicedTotal = project.type === "fixed" ? calculateInvoicedTotal(project.id) : 0;
          const isEditing = editingProjectId === project.id;

          return (
            <div key={project.id} className="project-card">
              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="edit-form">
                  <input
                    type="text"
                    name="id"
                    value={editedProject.id}
                    onChange={handleInputChange}
                    disabled
                  />
                  <input
                    type="text"
                    name="client"
                    value={editedProject.client}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    name="address"
                    value={editedProject.address}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    name="nifNie"
                    value={editedProject.nifNie}
                    onChange={handleInputChange}
                  />
                  <select name="type" value={editedProject.type} onChange={handleTypeChange}>
                    <option value="hourly">Por horas</option>
                    <option value="fixed">Presupuesto cerrado</option>
                  </select>
                  {editedProject.type === "hourly" ? (
                    <>
                      <input
                        type="number"
                        name="officialPrice"
                        value={editedProject.officialPrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                      <input
                        type="number"
                        name="workerPrice"
                        value={editedProject.workerPrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                    </>
                  ) : (
                    <input
                      type="number"
                      name="budgetAmount"
                      value={editedProject.budgetAmount}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                    />
                  )}
                  <button type="submit">Guardar cambios</button>
                  <button type="button" onClick={() => setEditingProjectId(null)}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <p><strong>ID:</strong> {project.id}</p>
                  <p><strong>Cliente:</strong> {project.client}</p>
                  <p><strong>Dirección:</strong> {project.address}</p>
                  <p><strong>NIF/NIE:</strong> {project.nifNie}</p>
                  <p><strong>Tipo:</strong> {project.type === "hourly" ? "Por horas" : "Presupuesto cerrado"}</p>
                  {project.type === "hourly" ? (
                    <>
                      <p><strong>Precio oficial:</strong> {formatCurrency(project.officialPrice)}/h</p>
                      <p><strong>Precio peón:</strong> {formatCurrency(project.workerPrice)}/h</p>
                    </>
                  ) : (
                    <p><strong>Importe presupuestado:</strong> {formatCurrency(project.budgetAmount)}</p>
                  )}
                  <h5>Resumen de costes</h5>
                  {project.type === "hourly" ? (
                    <>
                      <p>Mano de obra: {formatCurrency(costs.laborCost)}</p>
                      <p>Materiales: {formatCurrency(costs.materialsCost)}</p>
                      <p>Total: {formatCurrency(costs.totalCost)}</p>
                    </>
                  ) : (
                    <p><strong>Importe facturado total:</strong> {formatCurrency(invoicedTotal)}</p>
                  )}
                  <button onClick={() => startEditing(project)}>Editar</button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    style={{ backgroundColor: "#e74c3c", marginLeft: "10px" }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ProjectsViewer);