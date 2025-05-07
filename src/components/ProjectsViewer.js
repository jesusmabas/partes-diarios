// src/components/ProjectsViewer.js
import React, { useState, useCallback, useEffect } from "react";
// Importar formatNumber para las horas y formatCurrency para los euros
import { formatCurrency, formatNumber } from "../utils/calculationUtils"; // Asegúrate que la ruta sea correcta
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
import ConfirmModal from "./common/ConfirmModal"; // Importar el modal de confirmación

const ProjectsViewer = () => {
  const [editingProjectId, setEditingProjectId] = useState(null); // Stores firestoreId
  const [editedProject, setEditedProject] = useState(null); // Stores the full project object being edited
  const [projectToDelete, setProjectToDelete] = useState(null); // Stores the project object to delete
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Hook de validación para el formulario de edición
  const {
    values: editedValues,
    handleChange: handleEditChange,
    handleBlur: handleEditBlur,
    handleSubmit: handleEditSubmitInternal,
    resetForm: resetEditForm,
    isValid: isEditFormValid,
    errors: editErrors,
    hasError: editHasError,
    getError: editGetError,
    setValues: setEditedValues // Para inicializar el form al editar
  } = useFormValidation({}, projectSchema); // Inicializar vacío, se llenará al editar

  // Hooks de React Query
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQueryProjects();
  const { data: reportsData } = useQueryReportsInfinite({ pageSize: 1000 }); // Fetch reports for calculations
  const addProjectMutation = useAddProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  // Efecto para inicializar el formulario de edición cuando se selecciona un proyecto
  useEffect(() => {
    if (editedProject) {
      setEditedValues(editedProject); // Usar setValues del hook de validación
    } else {
      resetEditForm({}); // Resetear si no hay proyecto editándose
    }
  }, [editedProject, setEditedValues, resetEditForm]);

  // Efecto para limpiar mensajes después de un tiempo
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  // Extraer reportes de los datos paginados
  const reports = React.useMemo(() => {
    if (!reportsData) return [];
    return reportsData.pages.flatMap(page => page.items || []);
  }, [reportsData]);

  // Iniciar edición
  const startEditing = useCallback((project) => {
    if (!project || !project.firestoreId) {
      setErrorMessage("Error al iniciar edición: Faltan datos del proyecto.");
      return;
    }
    setEditingProjectId(project.firestoreId);
    setEditedProject({ ...project }); // Guardar el proyecto completo para el form
  }, []);

  // Cancelar edición
  const cancelEditing = useCallback(() => {
    setEditingProjectId(null);
    setEditedProject(null);
  }, []);

  // Manejar envío del formulario de edición (función interna que llama a la mutación)
  const handleEditSubmit = useCallback(async (formDataFromHook) => {
    const projectToUpdate = {
      ...formDataFromHook,
      // Asegurarse de que los campos numéricos sean números
      officialPrice: parseFloat(formDataFromHook.officialPrice) || 0,
      workerPrice: parseFloat(formDataFromHook.workerPrice) || 0,
      budgetAmount: parseFloat(formDataFromHook.budgetAmount) || 0,
      firestoreId: editingProjectId // Usar el ID guardado en el estado
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
        data: projectToUpdate // Enviar los datos validados
      });
      cancelEditing();
      setSuccessMessage("Proyecto actualizado correctamente!");
    } catch (err) {
      console.error("Error en handleEditSubmit:", err);
      setErrorMessage(`Error al actualizar proyecto: ${err.message || 'Error desconocido'}`);
    }
  }, [editingProjectId, updateProjectMutation, cancelEditing]);

  // Crear el handler que el formulario usará, conectando validación y envío
  const actualEditFormSubmitHandler = handleEditSubmitInternal(handleEditSubmit);

  // Iniciar proceso de eliminación (mostrar modal)
  const handleDeleteRequest = useCallback((project) => {
    if (!project || !project.firestoreId) {
      setErrorMessage("Error: No se puede eliminar, falta información del proyecto.");
      return;
    }
    setProjectToDelete(project); // Guardar el proyecto completo para el modal
  }, []);

  // Cancelar eliminación (cerrar modal)
  const handleDeleteCancel = useCallback(() => {
    setProjectToDelete(null);
  }, []);

  // Confirmar y ejecutar eliminación
  const handleDeleteConfirm = useCallback(async () => {
    if (!projectToDelete || !projectToDelete.firestoreId) return;

    try {
      setSuccessMessage("");
      setErrorMessage("");
      await deleteProjectMutation.mutateAsync(projectToDelete.firestoreId);
      setProjectToDelete(null); // Cerrar modal
      setSuccessMessage("Proyecto eliminado.");
    } catch (err) {
      console.error("Error en handleDeleteConfirm:", err);
      setErrorMessage(`Error al eliminar: ${err.message || 'Error desconocido'}`);
      setProjectToDelete(null); // Cerrar modal incluso si hay error
    }
  }, [projectToDelete, deleteProjectMutation]);

  // Calcular costos y horas para proyectos por horas
  const calculateProjectCostsAndHours = useCallback((projectId, projectType) => {
    if (projectType !== "hourly") return { laborCost: 0, materialsCost: 0, totalCost: 0, officialHours: 0, workerHours: 0 };
    const projectReports = reports.filter((report) => report.projectId === projectId && !report.isExtraWork);
    let laborCost = 0;
    let materialsCost = 0;
    let officialHours = 0;
    let workerHours = 0;

    projectReports.forEach((report) => {
      laborCost += report.labor?.totalLaborCost || 0;
      materialsCost += report.totalMaterialsCost || 0;
      officialHours += report.labor?.officialHours || 0;
      workerHours += report.labor?.workerHours || 0;
    });
    return { laborCost, materialsCost, totalCost: laborCost + materialsCost, officialHours, workerHours };
  }, [reports]);

  // Calcular total facturado para proyectos de presupuesto cerrado
  const calculateInvoicedTotal = useCallback((project) => {
      if (project?.type !== "fixed") return 0;
      // Priorizar el valor precalculado si existe
      if (project.totalInvoicedAmount !== undefined && project.totalInvoicedAmount !== null) {
          return project.totalInvoicedAmount;
      }
      // Fallback: calcular sumando reportes (menos eficiente)
      console.warn(`Fallback calculation for invoicedTotal on project ${project.id}`);
      const projectReports = reports.filter((report) => report.projectId === project.id && !report.isExtraWork && report.invoicedAmount);
      return projectReports.reduce((sum, report) => sum + (parseFloat(report.invoicedAmount) || 0), 0);
  }, [reports]);

  // Calcular totales de trabajos extra
  const calculateExtraWorkTotal = useCallback((projectId) => {
    const extraReports = reports.filter(
      (report) => report.projectId === projectId && report.isExtraWork
    );
    let totalExtraBudget = 0;
    let totalExtraCost = 0; // Costo total de extras por horas (MO+Mat)
    let totalExtraLaborCost = 0; // Costo MO de extras por horas
    let extraOfficialHours = 0;
    let extraWorkerHours = 0;

    extraReports.forEach(report => {
      if (report.extraWorkType === "additional_budget") {
        totalExtraBudget += parseFloat(report.extraBudgetAmount) || 0;
      } else if (report.extraWorkType === "hourly") {
        const labor = parseFloat(report.labor?.totalLaborCost) || 0;
        const mats = parseFloat(report.totalMaterialsCost) || 0;
        totalExtraCost += parseFloat(report.totalCost) || (labor + mats);
        totalExtraLaborCost += labor; // Acumular coste MO extra
        extraOfficialHours += report.labor?.officialHours || 0;
        extraWorkerHours += report.labor?.workerHours || 0;
      }
    });
    // El ingreso total extra es la suma del presupuesto adicional y el coste de MO de los extras por horas
    const totalExtraIncome = totalExtraBudget + totalExtraLaborCost;
    return {
        totalExtraBudget,
        totalExtraCost,
        totalExtraIncome,
        extraOfficialHours,
        extraWorkerHours,
        count: extraReports.length
    };
  }, [reports]);

  // Estado de carga general o mutación en progreso
  const isMutating = addProjectMutation.isPending || updateProjectMutation.isPending || deleteProjectMutation.isPending;

  // Renderizado condicional de carga y error
  if (projectsLoading) return <p>Cargando proyectos...</p>;
  if (projectsError) return <p className="error-message">Error al cargar proyectos: {projectsError.message}</p>;

  return (
    <div className="projects-viewer">
      <h2>Proyectos</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      {/* Formulario para añadir nuevos proyectos */}
      <ProjectForm onProjectAdded={() => setSuccessMessage("Proyecto añadido correctamente!")} />

      <h3 className="section-title">Lista de Proyectos</h3>
      <div className="projects-list">
        {projects.map((project) => {
          // Calcular datos derivados para cada proyecto
          const { laborCost, materialsCost, totalCost, officialHours, workerHours } = calculateProjectCostsAndHours(project.id, project.type);
          const invoicedTotal = calculateInvoicedTotal(project);
          const extraWork = project.type === "fixed" ? calculateExtraWorkTotal(project.id) : { totalExtraIncome: 0, count: 0, extraOfficialHours: 0, extraWorkerHours: 0 };
          const isEditing = editingProjectId === project.firestoreId;

          return (
            <div key={project.firestoreId} className={`project-card ${isEditing ? 'editing' : ''}`}>
              {isEditing ? (
                // --- Formulario de Edición ---
                <form onSubmit={actualEditFormSubmitHandler} className="edit-form project-form">
                   {/* ID no editable */}
                   <div className="form-group">
                     <label>ID Proyecto (No editable)</label>
                     <input type="text" value={editedValues.id || ''} disabled />
                   </div>
                   {/* Cliente */}
                   <div className="form-group">
                     <label htmlFor={`edit-client-${project.firestoreId}`}>Cliente</label>
                     <input
                       id={`edit-client-${project.firestoreId}`}
                       type="text"
                       name="client"
                       value={editedValues.client || ''}
                       onChange={handleEditChange}
                       onBlur={handleEditBlur}
                       className={editHasError('client') ? 'input-error' : ''}
                     />
                     {editHasError('client') && <p className="error-message">{editGetError('client')}</p>}
                   </div>
                   {/* Dirección */}
                    <div className="form-group">
                     <label htmlFor={`edit-address-${project.firestoreId}`}>Dirección</label>
                     <input
                       id={`edit-address-${project.firestoreId}`}
                       type="text"
                       name="address"
                       value={editedValues.address || ''}
                       onChange={handleEditChange}
                       onBlur={handleEditBlur}
                       className={editHasError('address') ? 'input-error' : ''}
                     />
                     {editHasError('address') && <p className="error-message">{editGetError('address')}</p>}
                   </div>
                   {/* NIF/NIE */}
                    <div className="form-group">
                     <label htmlFor={`edit-nifNie-${project.firestoreId}`}>NIF/NIE</label>
                     <input
                       id={`edit-nifNie-${project.firestoreId}`}
                       type="text"
                       name="nifNie"
                       value={editedValues.nifNie || ''}
                       onChange={handleEditChange}
                       onBlur={handleEditBlur}
                       className={editHasError('nifNie') ? 'input-error' : ''}
                     />
                     {editHasError('nifNie') && <p className="error-message">{editGetError('nifNie')}</p>}
                   </div>
                   {/* Tipo */}
                   <div className="form-group">
                     <label htmlFor={`edit-type-${project.firestoreId}`}>Tipo</label>
                     <select
                        id={`edit-type-${project.firestoreId}`}
                        name="type"
                        value={editedValues.type || 'hourly'}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editHasError('type') ? 'input-error' : ''}
                     >
                       <option value="hourly">Por horas</option>
                       <option value="fixed">Presupuesto cerrado</option>
                     </select>
                      {editHasError('type') && <p className="error-message">{editGetError('type')}</p>}
                   </div>
                   {/* Campos condicionales según tipo */}
                   {editedValues.type === "hourly" ? (
                     <>
                       <div className="form-group">
                         <label htmlFor={`edit-officialPrice-${project.firestoreId}`}>Precio oficial (€/h)</label>
                         <input
                           id={`edit-officialPrice-${project.firestoreId}`}
                           type="number" name="officialPrice" min="0" step="0.01"
                           value={editedValues.officialPrice || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                           className={editHasError('officialPrice') ? 'input-error' : ''} />
                         {editHasError('officialPrice') && <p className="error-message">{editGetError('officialPrice')}</p>}
                       </div>
                       <div className="form-group">
                         <label htmlFor={`edit-workerPrice-${project.firestoreId}`}>Precio peón (€/h)</label>
                         <input
                           id={`edit-workerPrice-${project.firestoreId}`}
                           type="number" name="workerPrice" min="0" step="0.01"
                           value={editedValues.workerPrice || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                           className={editHasError('workerPrice') ? 'input-error' : ''} />
                         {editHasError('workerPrice') && <p className="error-message">{editGetError('workerPrice')}</p>}
                       </div>
                     </>
                   ) : ( // Tipo 'fixed'
                     <>
                       <div className="form-group">
                         <label htmlFor={`edit-budgetAmount-${project.firestoreId}`}>Importe presupuestado (€)</label>
                         <input
                           id={`edit-budgetAmount-${project.firestoreId}`}
                           type="number" name="budgetAmount" min="0" step="0.01"
                           value={editedValues.budgetAmount || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                           className={editHasError('budgetAmount') ? 'input-error' : ''} />
                         {editHasError('budgetAmount') && <p className="error-message">{editGetError('budgetAmount')}</p>}
                       </div>
                       {/* Checkbox para permitir extras */}
                       <div className="form-group checkbox-group">
                         <input
                            type="checkbox"
                            name="allowExtraWork"
                            id={`edit-allowExtraWork-${project.firestoreId}`}
                            checked={editedValues.allowExtraWork || false}
                            onChange={handleEditChange} // Usa el mismo handler, detecta tipo checkbox
                            className="checkbox-input"
                         />
                         <label htmlFor={`edit-allowExtraWork-${project.firestoreId}`} className="checkbox-label">
                           Permitir trabajos extra
                         </label>
                       </div>
                       {/* Precios para extras si está permitido */}
                       {editedValues.allowExtraWork && (
                         <div className="extra-work-section">
                           <h4>Tarifas para trabajos extra por horas</h4>
                           <div className="form-group">
                             <label htmlFor={`edit-extra-officialPrice-${project.firestoreId}`}>Precio oficial extras (€/h)</label>
                             <input
                                id={`edit-extra-officialPrice-${project.firestoreId}`}
                                type="number" name="officialPrice" min="0" step="0.01"
                                value={editedValues.officialPrice || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                                className={editHasError('officialPrice') ? 'input-error' : ''} />
                             {editHasError('officialPrice') && <p className="error-message">{editGetError('officialPrice')}</p>}
                           </div>
                           <div className="form-group">
                             <label htmlFor={`edit-extra-workerPrice-${project.firestoreId}`}>Precio peón extras (€/h)</label>
                             <input
                                id={`edit-extra-workerPrice-${project.firestoreId}`}
                                type="number" name="workerPrice" min="0" step="0.01"
                                value={editedValues.workerPrice || 0} onChange={handleEditChange} onBlur={handleEditBlur}
                                className={editHasError('workerPrice') ? 'input-error' : ''} />
                             {editHasError('workerPrice') && <p className="error-message">{editGetError('workerPrice')}</p>}
                           </div>
                         </div>
                       )}
                     </>
                   )}
                   {/* Botones de acción del formulario de edición */}
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
                // --- Vista de Detalles del Proyecto ---
                <>
                  <p><strong>ID:</strong> {project.id}</p>
                  <p><strong>Cliente:</strong> {project.client}</p>
                  <p><strong>Dirección:</strong> {project.address}</p>
                  <p><strong>NIF/NIE:</strong> {project.nifNie}</p>
                  <p><strong>Tipo:</strong> {project.type === "hourly" ? "Por horas" : "Presupuesto cerrado"}</p>
                  {/* Detalles específicos por tipo */}
                  {project.type === "hourly" ? (
                    <>
                      <p><strong>Precio oficial:</strong> {formatCurrency(project.officialPrice)}/h</p>
                      <p><strong>Precio peón:</strong> {formatCurrency(project.workerPrice)}/h</p>
                      <p><strong>Horas Oficial Acumuladas:</strong> {formatNumber(officialHours)} h</p>
                      <p><strong>Horas Peón Acumuladas:</strong> {formatNumber(workerHours)} h</p>
                    </>
                  ) : ( // Tipo 'fixed'
                    <>
                      <p><strong>Presupuestado:</strong> {formatCurrency(project.budgetAmount)}</p>
                      <p><strong>Facturado Total (Presup.):</strong> {formatCurrency(invoicedTotal)}</p>
                      {project.allowExtraWork && <p><strong>Permite Extras:</strong> Sí</p>}
                      {/* Mostrar precios de extras si están definidos y permitidos */}
                      {project.allowExtraWork && (
                          <>
                           <p><strong>€ Oficial (Extras):</strong> {formatCurrency(project.officialPrice)}/h</p>
                           <p><strong>€ Peón (Extras):</strong> {formatCurrency(project.workerPrice)}/h</p>
                          </>
                      )}
                    </>
                  )}
                  {/* Resumen de costos/progreso */}
                  <h5>Resumen Actual</h5>
                  {project.type === "hourly" ? (
                    <>
                      <p>M.Obra: {formatCurrency(laborCost)} | Materiales: {formatCurrency(materialsCost)} | <strong>Total: {formatCurrency(totalCost)}</strong></p>
                      <p>Horas Totales: {formatNumber(officialHours + workerHours)} h</p>
                    </>
                  ) : ( // Tipo 'fixed'
                    <>
                      <p>Progreso (Presup.): {project.budgetAmount > 0 ? ((invoicedTotal / project.budgetAmount) * 100).toFixed(1) : 0}%</p>
                      {extraWork.count > 0 && (
                        <p>Trabajos Extra: {extraWork.count} partes | Ingreso Extra: {formatCurrency(extraWork.totalExtraIncome)} | Horas Extra: {formatNumber(extraWork.extraOfficialHours + extraWork.extraWorkerHours)} h</p>
                      )}
                    </>
                  )}
                  {/* Botones de acción para vista de detalles */}
                  <div className="project-actions">
                    <button onClick={() => startEditing(project)} disabled={isMutating}>
                      Editar
                    </button>
                    <button onClick={() => handleDeleteRequest(project)} // Cambiado para mostrar modal
                            style={{ backgroundColor: "#e74c3c", marginLeft: "10px" }}
                            disabled={isMutating}>
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

       {/* Modal de Confirmación de Eliminación */}
       {projectToDelete && (
        <ConfirmModal
          title="Confirmar Eliminación"
          message={`¿Estás seguro de que quieres eliminar el proyecto "${projectToDelete.id || 'proyecto sin ID'}"? Esta acción no se puede deshacer.`}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDangerous={true} // Estilo de botón de confirmación peligroso
          confirmButtonClass={deleteProjectMutation.isPending ? 'button-loading' : ''} // Añadir clase si está cargando
        />
      )}
    </div>
  );
};

export default React.memo(ProjectsViewer);