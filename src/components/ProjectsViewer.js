import React, { useState, useCallback, useEffect } from "react";
import { formatCurrency } from "../utils/formatters";
import ProjectForm from "./ProjectForm";
import { 
  useQueryProjects, 
  useAddProject, 
  useUpdateProject, 
  useDeleteProject 
} from "../hooks/useQueryProjects";
import { useQueryReportsInfinite } from "../hooks/useQueryReports";

const ProjectsViewer = () => {
  // Estados locales para edición y formularios
  const [newProject, setNewProject] = useState({ 
    id: "", 
    client: "", 
    address: "", 
    nifNie: "", 
    officialPrice: 0, 
    workerPrice: 0, 
    type: "hourly", 
    budgetAmount: 0,
    allowExtraWork: false
  });
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editedProject, setEditedProject] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // React Query: obtener proyectos
  const { 
    data: projects = [], 
    isLoading: projectsLoading, 
    error: projectsError 
  } = useQueryProjects();

  // React Query: obtener reportes
  const { 
    data: reportsData,
    isLoading: reportsLoading
  } = useQueryReportsInfinite({
    pageSize: 1000 // Obtener muchos reportes para cálculos
  });

  // React Query: mutaciones para proyectos
  const addProjectMutation = useAddProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  // Convertir reportes paginados a lista plana
  const reports = React.useMemo(() => {
    if (!reportsData) return [];
    return reportsData.pages.flatMap(page => page.items || []);
  }, [reportsData]);

  // Resetear mensajes después de 5 segundos
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : 
                      (name === "officialPrice" || name === "workerPrice" || name === "budgetAmount" ? 
                      parseFloat(value) || 0 : value);
    
    if (editingProjectId) {
      setEditedProject((prev) => ({ ...prev, [name]: finalValue }));
    } else {
      setNewProject((prev) => ({ ...prev, [name]: finalValue }));
    }
  }, [editingProjectId]);

  const handleTypeChange = useCallback((e) => {
    if (editingProjectId) {
      setEditedProject((prev) => ({ 
        ...prev, 
        type: e.target.value, 
        officialPrice: e.target.value === "hourly" ? prev.officialPrice : 0, 
        workerPrice: e.target.value === "hourly" ? prev.workerPrice : 0 
      }));
    } else {
      setNewProject((prev) => ({ 
        ...prev, 
        type: e.target.value, 
        officialPrice: e.target.value === "hourly" ? prev.officialPrice : 0, 
        workerPrice: e.target.value === "hourly" ? prev.workerPrice : 0 
      }));
    }
  }, [editingProjectId]);

  const handleAllowExtraWorkChange = useCallback((e) => {
    const checked = e.target.checked;
    if (editingProjectId) {
      setEditedProject((prev) => ({ ...prev, allowExtraWork: checked }));
    } else {
      setNewProject((prev) => ({ ...prev, allowExtraWork: checked }));
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
      
      // Usar la mutación de React Query
      await addProjectMutation.mutateAsync(trimmedProject);
      
      setNewProject({ 
        id: "", 
        client: "", 
        address: "", 
        nifNie: "", 
        officialPrice: 0, 
        workerPrice: 0, 
        type: "hourly", 
        budgetAmount: 0,
        allowExtraWork: false
      });
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
      // Usar la mutación de React Query
      await updateProjectMutation.mutateAsync({ 
        projectId: editedProject.id, 
        data: editedProject 
      });
      
      setEditingProjectId(null);
      setEditedProject(null);
      setSuccessMessage("Proyecto actualizado correctamente!");
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(`Error al actualizar proyecto: ${err.message}`);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      // Usar la mutación de React Query
      await deleteProjectMutation.mutateAsync(projectId);
      setSuccessMessage("Proyecto eliminado correctamente!");
      setErrorMessage("");
    } catch (err) {
      console.error("Error en handleDelete:", err);
      setErrorMessage(`Error al eliminar proyecto: ${err.message}`);
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

  const calculateExtraWorkTotal = (projectId) => {
    const extraReports = reports.filter(
      (report) => report.projectId === projectId && report.isExtraWork
    );
    
    let totalExtraBudget = 0;
    let totalExtraCost = 0;
    
    extraReports.forEach(report => {
      if (report.extraWorkType === "additional_budget") {
        totalExtraBudget += report.extraBudgetAmount || 0;
      } else if (report.extraWorkType === "hourly") {
        totalExtraCost += report.totalCost || 0;
      }
    });
    
    return {
      totalExtraBudget,
      totalExtraCost,
      totalExtra: totalExtraBudget + totalExtraCost,
      count: extraReports.length
    };
  };

  // Estados de carga
  const isLoading = projectsLoading || (reportsLoading && reports.length === 0);
  const isMutating = addProjectMutation.isPending || updateProjectMutation.isPending || deleteProjectMutation.isPending;
  
  // Mostrar indicador de carga
  if (isLoading) return <p>Cargando proyectos...</p>;
  
  // Mostrar errores
  if (projectsError) return <p className="error-message">Error: {projectsError.message}</p>;

  return (
    <div className="projects-viewer">
      <h2>Proyectos</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      {/* Usar el componente ProjectForm si está disponible */}
      {React.createElement(ProjectForm || 'form', {
        onProjectAdded: (newProject) => {
          setSuccessMessage("Proyecto añadido correctamente!");
        },
        onSubmit: handleAddProject
      })}

      {/* Si no se está usando ProjectForm, mostrar el formulario manual */}
      {!ProjectForm && (
        <form onSubmit={handleAddProject} className="project-form">
          {/* Campos del formulario */}
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
            <>
              <input
                type="number"
                name="budgetAmount"
                placeholder="Importe presupuestado (€)"
                value={newProject.budgetAmount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
              
              {/* Checkbox para permitir trabajos extra */}
              <div className="form-group checkbox-group">
                <input
                  id="project-allow-extra"
                  type="checkbox"
                  name="allowExtraWork"
                  checked={newProject.allowExtraWork}
                  onChange={handleAllowExtraWorkChange}
                  className="checkbox-input"
                />
                <label htmlFor="project-allow-extra" className="checkbox-label">
                  Permitir trabajos extra fuera de presupuesto
                </label>
              </div>
              
              {/* Mostrar campos adicionales si se permiten trabajos extra */}
              {newProject.allowExtraWork && (
                <div className="extra-work-section">
                  <h4>Tarifas para trabajos extra por horas</h4>
                  <p className="hint-text">Estos precios se aplicarán solo a trabajos extra facturados por horas</p>
                  
                  <div className="form-group">
                    <label htmlFor="project-extra-official-price">Precio oficial para extras (€/h)</label>
                    <input
                      id="project-extra-official-price"
                      type="number"
                      name="officialPrice"
                      value={newProject.officialPrice}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      placeholder="Precio por hora del oficial para trabajos extra"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="project-extra-worker-price">Precio peón para extras (€/h)</label>
                    <input
                      id="project-extra-worker-price"
                      type="number"
                      name="workerPrice"
                      value={newProject.workerPrice}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      placeholder="Precio por hora del peón para trabajos extra"
                    />
                  </div>
                </div>
              )}
            </>
          )}
          <button type="submit" disabled={isMutating}>
            {isMutating ? "Añadiendo..." : "Añadir proyecto"}
          </button>
        </form>
      )}

      <div className="projects-list">
        {projects.map((project) => {
          const costs = calculateProjectCosts(project.id, project.type);
          const invoicedTotal = project.type === "fixed" ? calculateInvoicedTotal(project.id) : 0;
          const extraWork = project.type === "fixed" ? calculateExtraWorkTotal(project.id) : { totalExtra: 0, count: 0 };
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
                    <>
                      <input
                        type="number"
                        name="budgetAmount"
                        value={editedProject.budgetAmount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                      
                      {/* Checkbox para permitir trabajos extra en modo edición */}
                      <div className="form-group checkbox-group">
                        <input
                          id="edit-project-allow-extra"
                          type="checkbox"
                          name="allowExtraWork"
                          checked={editedProject.allowExtraWork || false}
                          onChange={handleAllowExtraWorkChange}
                          className="checkbox-input"
                        />
                        <label htmlFor="edit-project-allow-extra" className="checkbox-label">
                          Permitir trabajos extra fuera de presupuesto
                        </label>
                      </div>
                      
                      {/* Campos adicionales si se permiten trabajos extra */}
                      {editedProject.allowExtraWork && (
                        <div className="extra-work-section">
                          <h4>Tarifas para trabajos extra por horas</h4>
                          <p className="hint-text">Estos precios se aplicarán solo a trabajos extra facturados por horas</p>
                          
                          <div className="form-group">
                            <label htmlFor="edit-project-extra-official-price">Precio oficial para extras (€/h)</label>
                            <input
                              id="edit-project-extra-official-price"
                              type="number"
                              name="officialPrice"
                              value={editedProject.officialPrice || 0}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              placeholder="Precio por hora del oficial para trabajos extra"
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="edit-project-extra-worker-price">Precio peón para extras (€/h)</label>
                            <input
                              id="edit-project-extra-worker-price"
                              type="number"
                              name="workerPrice"
                              value={editedProject.workerPrice || 0}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              placeholder="Precio por hora del peón para trabajos extra"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <button type="submit" disabled={updateProjectMutation.isPending}>
                    {updateProjectMutation.isPending ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditingProjectId(null)}
                    disabled={updateProjectMutation.isPending}
                  >
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
                    <>
                      <p><strong>Importe presupuestado:</strong> {formatCurrency(project.budgetAmount)}</p>
                      {project.allowExtraWork && (
                        <p><strong>Permite trabajos extra:</strong> Sí</p>
                      )}
                      {project.allowExtraWork && (
                        <>
                          <p><strong>Precio oficial (extras):</strong> {formatCurrency(project.officialPrice)}/h</p>
                          <p><strong>Precio peón (extras):</strong> {formatCurrency(project.workerPrice)}/h</p>
                        </>
                      )}
                    </>
                  )}
                  
                  <h5>Resumen de costes</h5>
                  {project.type === "hourly" ? (
                    <>
                      <p>Mano de obra: {formatCurrency(costs.laborCost)}</p>
                      <p>Materiales: {formatCurrency(costs.materialsCost)}</p>
                      <p>Total: {formatCurrency(costs.totalCost)}</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Importe facturado total:</strong> {formatCurrency(invoicedTotal)}</p>
                      {extraWork.count > 0 && (
                        <div className="extra-work-summary">
                          <p><strong>Trabajos extra:</strong> {extraWork.count} partes</p>
                          <p><strong>Importe total extra:</strong> {formatCurrency(extraWork.totalExtra)}</p>
                        </div>
                      )}
                    </>
                  )}
                  <button 
                    onClick={() => startEditing(project)}
                    disabled={isMutating}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    style={{ backgroundColor: "#e74c3c", marginLeft: "10px" }}
                    disabled={deleteProjectMutation.isPending}
                  >
                    {deleteProjectMutation.isPending && project.id === deleteProjectMutation.variables ? "Eliminando..." : "Eliminar"}
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