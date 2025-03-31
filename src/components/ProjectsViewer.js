// src/components/ProjectsViewer.js
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
import { projectSchema } from "../utils/validationSchemas";
import useFormValidation from "../hooks/useFormValidation";

const ProjectsViewer = () => {
  const [editingProjectId, setEditingProjectId] = useState(null); // Stores firestoreId
  const [editedProject, setEditedProject] = useState(null); // Stores the full project object being edited
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    values: editedValues,
    handleChange: handleEditChange,
    handleBlur: handleEditBlur,
    handleSubmit: handleEditSubmitInternal,
    resetForm: resetEditForm,
    isValid: isEditFormValid, // Get validity state
    errors: editErrors,       // Get errors
    hasError: editHasError,   // Get error checker
    getError: editGetError    // Get error message function
  } = useFormValidation(editedProject || {}, projectSchema);

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQueryProjects();
  const { data: reportsData } = useQueryReportsInfinite({ pageSize: 1000 }); // Fetch reports for calculations
  const addProjectMutation = useAddProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  useEffect(() => {
    if (editedProject) {
      resetEditForm(editedProject);
    }
  }, [editedProject, resetEditForm]);

  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  const reports = React.useMemo(() => {
    if (!reportsData) return [];
    return reportsData.pages.flatMap(page => page.items || []);
  }, [reportsData]);

  const startEditing = useCallback((project) => {
    if (!project || !project.firestoreId) {
      setErrorMessage("Error al iniciar edición: Faltan datos del proyecto.");
      return;
    }
    setEditingProjectId(project.firestoreId);
    setEditedProject({ ...project });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingProjectId(null);
    setEditedProject(null);
    resetEditForm({}); // Reset form state as well
  }, [resetEditForm]);

  const handleEditSubmit = useCallback(async (formDataFromHook) => {
    const projectToUpdate = {
      ...formDataFromHook,
      firestoreId: editingProjectId
    };

    if (!projectToUpdate.firestoreId) {
      setErrorMessage("Error crítico: No se encontró el ID interno para actualizar.");
      return;
    }

    try {
      setSuccessMessage("");
      setErrorMessage("");
      await updateProjectMutation.mutateAsync({
        firestoreId: projectToUpdate.firestoreId,
        data: projectToUpdate
      });
      cancelEditing();
      setSuccessMessage("Proyecto actualizado correctamente!");
    } catch (err) {
      console.error("Error en handleEditSubmit:", err);
      setErrorMessage(`Error al actualizar proyecto: ${err.message || 'Error desconocido'}`);
    }
  }, [editingProjectId, updateProjectMutation, cancelEditing]);

  const actualEditFormSubmitHandler = handleEditSubmitInternal(handleEditSubmit);

  const handleDelete = useCallback(async (projectToDelete) => {
    if (!projectToDelete || !projectToDelete.firestoreId) {
      setErrorMessage("Error: No se puede eliminar, falta información del proyecto.");
      return;
    }
    if (!window.confirm(`¿Seguro que quieres eliminar "${projectToDelete.id || 'proyecto sin ID'}"?`)) {
      return;
    }
    try {
      setSuccessMessage("");
      setErrorMessage("");
      await deleteProjectMutation.mutateAsync(projectToDelete.firestoreId);
      setSuccessMessage("Proyecto eliminado.");
    } catch (err) {
      console.error("Error en handleDelete:", err);
       setErrorMessage(`Error al eliminar: ${err.message || 'Error desconocido'}`);
    }
  }, [deleteProjectMutation]);

  const calculateProjectCosts = useCallback((projectId, projectType) => {
    if (projectType !== "hourly") return { laborCost: 0, materialsCost: 0, totalCost: 0 };
    const projectReports = reports.filter((report) => report.projectId === projectId && !report.isExtraWork);
    let laborCost = 0;
    let materialsCost = 0;
    projectReports.forEach((report) => {
      laborCost += report.labor?.totalLaborCost || 0;
      materialsCost += report.totalMaterialsCost || 0;
    });
    return { laborCost, materialsCost, totalCost: laborCost + materialsCost };
  }, [reports]);

  const calculateInvoicedTotal = useCallback((project) => {
      if (project?.type !== "fixed") return 0;
      // Prioritize the pre-calculated value
      if (project.totalInvoicedAmount !== undefined && project.totalInvoicedAmount !== null) {
          return project.totalInvoicedAmount;
      }
      // Fallback (should be less common now)
      const projectReports = reports.filter((report) => report.projectId === project.id && !report.isExtraWork && report.invoicedAmount);
      return projectReports.reduce((sum, report) => sum + (parseFloat(report.invoicedAmount) || 0), 0);
  }, [reports]);


  const calculateExtraWorkTotal = useCallback((projectId) => {
    const extraReports = reports.filter(
      (report) => report.projectId === projectId && report.isExtraWork
    );
    let totalExtraBudget = 0;
    let totalExtraCost = 0;
    extraReports.forEach(report => {
      if (report.extraWorkType === "additional_budget") {
        totalExtraBudget += parseFloat(report.extraBudgetAmount) || 0;
      } else if (report.extraWorkType === "hourly") {
        const labor = parseFloat(report.labor?.totalLaborCost) || 0;
        const mats = parseFloat(report.totalMaterialsCost) || 0;
        totalExtraCost += parseFloat(report.totalCost) || (labor + mats);
      }
    });
    return { totalExtraBudget, totalExtraCost, totalExtra: totalExtraBudget + totalExtraCost, count: extraReports.length };
  }, [reports]);

  const isMutating = addProjectMutation.isPending || updateProjectMutation.isPending || deleteProjectMutation.isPending;

  if (projectsLoading) return <p>Cargando proyectos...</p>;
  if (projectsError) return <p className="error-message">Error al cargar proyectos: {projectsError.message}</p>;

  return (
    <div className="projects-viewer">
      <h2>Proyectos</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      <ProjectForm onProjectAdded={() => setSuccessMessage("Proyecto añadido correctamente!")} />

      <div className="projects-list">
        {projects.map((project) => {
          const costs = calculateProjectCosts(project.id, project.type);
          const invoicedTotal = calculateInvoicedTotal(project); // Pass the whole project object
          const extraWork = project.type === "fixed" ? calculateExtraWorkTotal(project.id) : { totalExtra: 0, count: 0 };
          const isEditing = editingProjectId === project.firestoreId;

          return (
            <div key={project.firestoreId} className="project-card">
              {isEditing ? (
                <form onSubmit={actualEditFormSubmitHandler} className="edit-form">
                   <div className="form-group">
                     <label>ID Proyecto (No editable)</label>
                     <input type="text" value={editedValues.id || ''} disabled />
                   </div>
                   <div className="form-group">
                     <label>Cliente</label>
                     <input
                       type="text"
                       name="client"
                       value={editedValues.client || ''}
                       onChange={handleEditChange}
                       onBlur={handleEditBlur}
                       className={editHasError('client') ? 'input-error' : ''}
                     />
                     {editHasError('client') && <p className="error-message">{editGetError('client')}</p>}
                   </div>
                    <div className="form-group">
                     <label>Dirección</label>
                     <input
                       type="text"
                       name="address"
                       value={editedValues.address || ''}
                       onChange={handleEditChange}
                       onBlur={handleEditBlur}
                       className={editHasError('address') ? 'input-error' : ''}
                     />
                     {editHasError('address') && <p className="error-message">{editGetError('address')}</p>}
                   </div>
                    <div className="form-group">
                     <label>NIF/NIE</label>
                     <input
                       type="text"
                       name="nifNie"
                       value={editedValues.nifNie || ''}
                       onChange={handleEditChange}
                       onBlur={handleEditBlur}
                       className={editHasError('nifNie') ? 'input-error' : ''}
                     />
                     {editHasError('nifNie') && <p className="error-message">{editGetError('nifNie')}</p>}
                   </div>
                   <div className="form-group">
                     <label>Tipo</label>
                     <select name="type" value={editedValues.type || 'hourly'} onChange={handleEditChange} onBlur={handleEditBlur}>
                       <option value="hourly">Por horas</option>
                       <option value="fixed">Presupuesto cerrado</option>
                     </select>
                   </div>
                   {editedValues.type === "hourly" ? (
                     <>
                       <div className="form-group">
                         <label>Precio oficial (€/h)</label>
                         <input
                           type="number" name="officialPrice" min="0" step="0.01"
                           value={editedValues.officialPrice || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                           className={editHasError('officialPrice') ? 'input-error' : ''} />
                         {editHasError('officialPrice') && <p className="error-message">{editGetError('officialPrice')}</p>}
                       </div>
                       <div className="form-group">
                         <label>Precio peón (€/h)</label>
                         <input
                           type="number" name="workerPrice" min="0" step="0.01"
                           value={editedValues.workerPrice || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                           className={editHasError('workerPrice') ? 'input-error' : ''} />
                         {editHasError('workerPrice') && <p className="error-message">{editGetError('workerPrice')}</p>}
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="form-group">
                         <label>Importe presupuestado (€)</label>
                         <input
                           type="number" name="budgetAmount" min="0" step="0.01"
                           value={editedValues.budgetAmount || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                           className={editHasError('budgetAmount') ? 'input-error' : ''} />
                         {editHasError('budgetAmount') && <p className="error-message">{editGetError('budgetAmount')}</p>}
                       </div>
                       <div className="form-group checkbox-group">
                         <input type="checkbox" name="allowExtraWork" id={`edit-allowExtraWork-${project.firestoreId}`}
                           checked={editedValues.allowExtraWork || false} onChange={handleEditChange}
                           className="checkbox-input" />
                         <label htmlFor={`edit-allowExtraWork-${project.firestoreId}`} className="checkbox-label">
                           Permitir trabajos extra
                         </label>
                       </div>
                       {editedValues.allowExtraWork && (
                         <div className="extra-work-section">
                           <h4>Tarifas para trabajos extra por horas</h4>
                           <div className="form-group">
                             <label>Precio oficial extras (€/h)</label>
                             <input type="number" name="officialPrice" min="0" step="0.01"
                               value={editedValues.officialPrice || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                               className={editHasError('officialPrice') ? 'input-error' : ''} />
                             {editHasError('officialPrice') && <p className="error-message">{editGetError('officialPrice')}</p>}
                           </div>
                           <div className="form-group">
                             <label>Precio peón extras (€/h)</label>
                             <input type="number" name="workerPrice" min="0" step="0.01"
                               value={editedValues.workerPrice || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                               className={editHasError('workerPrice') ? 'input-error' : ''} />
                             {editHasError('workerPrice') && <p className="error-message">{editGetError('workerPrice')}</p>}
                           </div>
                         </div>
                       )}
                     </>
                   )}
                   <div className="form-actions">
                     <button type="submit" disabled={!isEditFormValid || updateProjectMutation.isPending}>
                       {updateProjectMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                     </button>
                     <button type="button" onClick={cancelEditing} disabled={updateProjectMutation.isPending} className="button-secondary">
                       Cancelar
                     </button>
                   </div>
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
                      <p><strong>Presupuestado:</strong> {formatCurrency(project.budgetAmount)}</p>
                      <p><strong>Facturado Total:</strong> {formatCurrency(invoicedTotal)}</p>
                      {project.allowExtraWork && <p><strong>Permite Extras:</strong> Sí</p>}
                      {project.allowExtraWork && (
                          <>
                           <p><strong>€ Oficial (Extras):</strong> {formatCurrency(project.officialPrice)}/h</p>
                           <p><strong>€ Peón (Extras):</strong> {formatCurrency(project.workerPrice)}/h</p>
                          </>
                      )}
                    </>
                  )}
                  <h5>Resumen Actual</h5>
                  {project.type === "hourly" ? (
                    <>
                      <p>M.Obra: {formatCurrency(costs.laborCost)} | Materiales: {formatCurrency(costs.materialsCost)} | <strong>Total: {formatCurrency(costs.totalCost)}</strong></p>
                    </>
                  ) : (
                    <>
                      <p>Progreso: {project.budgetAmount > 0 ? ((invoicedTotal / project.budgetAmount) * 100).toFixed(1) : 0}%</p>
                      {extraWork.count > 0 && (
                        <p>Trabajos Extra: {extraWork.count} partes | Total Extra: {formatCurrency(extraWork.totalExtra)}</p>
                      )}
                    </>
                  )}
                  <div className="project-actions">
                    <button onClick={() => startEditing(project)} disabled={isMutating}>
                      Editar
                    </button>
                    <button onClick={() => handleDelete(project)}
                            style={{ backgroundColor: "#e74c3c", marginLeft: "10px" }}
                            disabled={deleteProjectMutation.isPending}>
                      {deleteProjectMutation.isPending && deleteProjectMutation.variables === project.firestoreId ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
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