import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryProjects, useAddProject, useUpdateProject, useDeleteProject } from "../hooks/useQueryProjects";
import { useQueryReportsInfinite } from "../hooks/useQueryReports";
import useFormValidation from "../hooks/useFormValidation";
import { projectSchema } from "../utils/validationSchemas";
import ProjectForm from "./ProjectForm";
import ConfirmModal from "./common/ConfirmModal";
import { formatCurrency, formatNumber } from "../utils/calculationUtils";

const ProjectsViewer = () => {
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editedProject, setEditedProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Hook de validación para el formulario de edición
  const editFormValidation = useFormValidation(editedProject || {}, projectSchema);

  // Hooks de React Query
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQueryProjects();
  const { data: reportsData } = useQueryReportsInfinite({ pageSize: 1000 });
  const addProjectMutation = useAddProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  // Efecto para inicializar el formulario de edición cuando se selecciona un proyecto
  useEffect(() => {
    if (editedProject && editFormValidation.setValues) {
      editFormValidation.setValues(editedProject);
    } else if (!editedProject && editFormValidation.resetForm) {
      editFormValidation.resetForm({});
    }
  }, [editedProject?.firestoreId]); // Solo cuando cambia el ID del proyecto

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
  const reports = useMemo(() => {
    if (!reportsData?.pages) return [];
    return reportsData.pages.flatMap(page => page.items || []);
  }, [reportsData]);

  // Iniciar edición
  const startEditing = useCallback((project) => {
    if (!project || !project.firestoreId) {
      setErrorMessage("Error al iniciar edición: Faltan datos del proyecto.");
      return;
    }
    setEditingProjectId(project.firestoreId);
    setEditedProject({ ...project });
  }, []);

  // Cancelar edición
  const cancelEditing = useCallback(() => {
    setEditingProjectId(null);
    setEditedProject(null);
    setErrorMessage("");
  }, []);

  // Manejar envío del formulario de edición
  const handleEditSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!editFormValidation.isValid) {
      setErrorMessage("Por favor corrige los errores en el formulario");
      return;
    }

    if (!editingProjectId) {
      setErrorMessage("Error crítico: No se encontró el ID interno para actualizar.");
      return;
    }

    try {
      const projectToUpdate = {
        ...editFormValidation.values,
        officialPrice: parseFloat(editFormValidation.values.officialPrice) || 0,
        workerPrice: parseFloat(editFormValidation.values.workerPrice) || 0,
        budgetAmount: parseFloat(editFormValidation.values.budgetAmount) || 0,
      };

      await updateProjectMutation.mutateAsync({
        firestoreId: editingProjectId,
        data: projectToUpdate
      });

      cancelEditing();
      setSuccessMessage("Proyecto actualizado correctamente!");
    } catch (err) {
      console.error("Error en handleEditSubmit:", err);
      setErrorMessage(`Error al actualizar proyecto: ${err.message || 'Error desconocido'}`);
    }
  }, [editFormValidation, editingProjectId, updateProjectMutation, cancelEditing]);

  // Iniciar proceso de eliminación
  const handleDeleteRequest = useCallback((project) => {
    if (!project || !project.firestoreId) {
      setErrorMessage("Error: No se puede eliminar, falta información del proyecto.");
      return;
    }
    setProjectToDelete(project);
  }, []);

  // Cancelar eliminación
  const handleDeleteCancel = useCallback(() => {
    setProjectToDelete(null);
  }, []);

  // Confirmar y ejecutar eliminación
  const handleDeleteConfirm = useCallback(async () => {
    if (!projectToDelete) return;

    try {
      await deleteProjectMutation.mutateAsync(projectToDelete.firestoreId);
      setProjectToDelete(null);
      setSuccessMessage("Proyecto eliminado.");
    } catch (err) {
      console.error("Error en handleDeleteConfirm:", err);
      setErrorMessage(`Error al eliminar: ${err.message || 'Error desconocido'}`);
      setProjectToDelete(null);
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
      laborCost += parseFloat(report.labor?.totalLaborCost) || 0;
      materialsCost += parseFloat(report.totalMaterialsCost) || 0;
      officialHours += parseFloat(report.labor?.officialHours) || 0;
      workerHours += parseFloat(report.labor?.workerHours) || 0;
    });

    return { laborCost, materialsCost, totalCost: laborCost + materialsCost, officialHours, workerHours };
  }, [reports]);

  // Calcular total facturado
  const calculateInvoicedTotal = useCallback((project) => {
    if (project.totalInvoicedAmount !== undefined) {
      return project.totalInvoicedAmount;
    }

    console.warn(`Fallback calculation for invoicedTotal on project ${project.id}`);
    const projectReports = reports.filter((report) => report.projectId === project.id && !report.isExtraWork && report.invoicedAmount);
    return projectReports.reduce((sum, report) => sum + (parseFloat(report.invoicedAmount) || 0), 0);
  }, [reports]);

  // Calcular trabajo extra
  const calculateExtraWorkTotal = useCallback((projectId) => {
    const extraReports = reports.filter(
      (report) => report.projectId === projectId && report.isExtraWork
    );

    let totalExtraBudget = 0;
    let count = 0;
    let extraOfficialHours = 0;
    let extraWorkerHours = 0;
    let totalExtraCost = 0;

    extraReports.forEach(report => {
      count++;
      totalExtraBudget += parseFloat(report.extraBudgetAmount) || 0;
      extraOfficialHours += parseFloat(report.labor?.officialHours) || 0;
      extraWorkerHours += parseFloat(report.labor?.workerHours) || 0;
      const labor = parseFloat(report.labor?.totalLaborCost) || 0;
      const mats = parseFloat(report.totalMaterialsCost) || 0;
      totalExtraCost += parseFloat(report.totalCost) || (labor + mats);
    });

    return { totalExtraIncome: totalExtraBudget + totalExtraCost, count, extraOfficialHours, extraWorkerHours };
  }, [reports]);

  const isMutating = updateProjectMutation.isPending || deleteProjectMutation.isPending;

  if (projectsLoading) {
    return <div>Cargando proyectos...</div>;
  }

  if (projectsError) {
    return <div>Error al cargar proyectos: {projectsError.message}</div>;
  }

  return (
    <div className="projects-viewer">
      <h2>Gestión de Proyectos</h2>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <ProjectForm onProjectAdded={() => setSuccessMessage("Proyecto añadido correctamente!")} />

      <h3>Lista de Proyectos</h3>

      <div className="projects-list">
        {projects.map((project) => {
          const { laborCost, materialsCost, totalCost, officialHours, workerHours } = calculateProjectCostsAndHours(project.id, project.type);
          const invoicedTotal = calculateInvoicedTotal(project);
          const extraWork = project.type === "fixed" ? calculateExtraWorkTotal(project.id) : { totalExtraIncome: 0, count: 0, extraOfficialHours: 0, extraWorkerHours: 0 };

          return (
            <div key={project.firestoreId} className="project-card">
              {editingProjectId === project.firestoreId ? (
                <form onSubmit={handleEditSubmit} className="edit-form">
                  <h4>Editar Proyecto: {project.id}</h4>

                  <label>
                    Cliente:
                    <input
                      type="text"
                      name="client"
                      value={editFormValidation.values.client || ""}
                      onChange={editFormValidation.handleChange}
                      onBlur={editFormValidation.handleBlur}
                      className={editFormValidation.hasError('client') ? 'input-error' : ''}
                    />
                    {editFormValidation.hasError('client') && <p className="error-message">{editFormValidation.getError('client')}</p>}
                  </label>

                  <label>
                    Dirección:
                    <input
                      type="text"
                      name="address"
                      value={editFormValidation.values.address || ""}
                      onChange={editFormValidation.handleChange}
                      onBlur={editFormValidation.handleBlur}
                      className={editFormValidation.hasError('address') ? 'input-error' : ''}
                    />
                    {editFormValidation.hasError('address') && <p className="error-message">{editFormValidation.getError('address')}</p>}
                  </label>

                  <label>
                    NIF/NIE:
                    <input
                      type="text"
                      name="nifNie"
                      value={editFormValidation.values.nifNie || ""}
                      onChange={editFormValidation.handleChange}
                      onBlur={editFormValidation.handleBlur}
                      className={editFormValidation.hasError('nifNie') ? 'input-error' : ''}
                    />
                    {editFormValidation.hasError('nifNie') && <p className="error-message">{editFormValidation.getError('nifNie')}</p>}
                  </label>

                  <label>
                    Tipo:
                    <select
                      name="type"
                      value={editFormValidation.values.type || ""}
                      onChange={editFormValidation.handleChange}
                      className={editFormValidation.hasError('type') ? 'input-error' : ''}
                    >
                      <option value="hourly">Por Horas</option>
                      <option value="fixed">Presupuesto Cerrado</option>
                    </select>
                    {editFormValidation.hasError('type') && <p className="error-message">{editFormValidation.getError('type')}</p>}
                  </label>

                  {editFormValidation.values.type === "hourly" && (
                    <>
                      <label>
                        Precio Oficial (€/h):
                        <input
                          type="number"
                          step="0.01"
                          name="officialPrice"
                          value={editFormValidation.values.officialPrice || ""}
                          onChange={editFormValidation.handleChange}
                          className={editFormValidation.hasError('officialPrice') ? 'input-error' : ''} />
                        {editFormValidation.hasError('officialPrice') && <p className="error-message">{editFormValidation.getError('officialPrice')}</p>}
                      </label>

                      <label>
                        Precio Peón (€/h):
                        <input
                          type="number"
                          step="0.01"
                          name="workerPrice"
                          value={editFormValidation.values.workerPrice || ""}
                          onChange={editFormValidation.handleChange}
                          className={editFormValidation.hasError('workerPrice') ? 'input-error' : ''} />
                        {editFormValidation.hasError('workerPrice') && <p className="error-message">{editFormValidation.getError('workerPrice')}</p>}
                      </label>
                    </>
                  )}

                  {editFormValidation.values.type === "fixed" && (
                    <label>
                      Presupuesto (€):
                      <input
                        type="number"
                        step="0.01"
                        name="budgetAmount"
                        value={editFormValidation.values.budgetAmount || ""}
                        onChange={editFormValidation.handleChange}
                        className={editFormValidation.hasError('budgetAmount') ? 'input-error' : ''} />
                      {editFormValidation.hasError('budgetAmount') && <p className="error-message">{editFormValidation.getError('budgetAmount')}</p>}
                    </label>
                  )}

                  <div className="form-actions">
                    <button type="submit" disabled={isMutating || !editFormValidation.isValid}>
                      Guardar
                    </button>
                    <button type="button" onClick={cancelEditing} disabled={isMutating}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h4>{project.id}</h4>
                  <p><strong>Cliente:</strong> {project.client}</p>
                  <p><strong>Dirección:</strong> {project.address}</p>
                  <p><strong>NIF/NIE:</strong> {project.nifNie}</p>
                  <p><strong>Tipo:</strong> {project.type === "hourly" ? "Por Horas" : "Presupuesto Cerrado"}</p>

                  {project.type === "hourly" ? (
                    <>
                      <p><strong>Precio oficial:</strong> {formatCurrency(project.officialPrice)}/h</p>
                      <p><strong>Precio peón:</strong> {formatCurrency(project.workerPrice)}/h</p>
                      <p><strong>Horas Oficial Acumuladas:</strong> {formatNumber(officialHours)} h</p>
                      <p><strong>Horas Peón Acumuladas:</strong> {formatNumber(workerHours)} h</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Presupuestado:</strong> {formatCurrency(project.budgetAmount)}</p>
                      <p><strong>Facturado Total (Presup.):</strong> {formatCurrency(invoicedTotal)}</p>
                    </>
                  )}

                  {project.allowExtraWork && (
                    <>
                      <p><strong>€ Oficial (Extras):</strong> {formatCurrency(project.officialPrice)}/h</p>
                      <p><strong>€ Peón (Extras):</strong> {formatCurrency(project.workerPrice)}/h</p>
                    </>
                  )}

                  <p>M.Obra: {formatCurrency(laborCost)} | Materiales: {formatCurrency(materialsCost)} | <strong>Total: {formatCurrency(totalCost)}</strong></p>
                  <p>Horas Totales: {formatNumber(officialHours + workerHours)} h</p>

                  {project.type === "fixed" && (
                    <>
                      <p><strong>% Ejecutado:</strong> {
                        (() => {
                          const totalBudget = (project.budgetAmount || 0) + (extraWork.totalExtraIncome || 0);
                          return totalBudget > 0 ? ((invoicedTotal / totalBudget) * 100).toFixed(1) : 0;
                        })()
                      }%</p>
                      <p>Trabajos Extra: {extraWork.count} partes | Ingreso Extra: {formatCurrency(extraWork.totalExtraIncome)} | Horas Extra: {formatNumber(extraWork.extraOfficialHours + extraWork.extraWorkerHours)} h</p>
                    </>
                  )}

                  <div className="report-actions">
                    <button onClick={() => startEditing(project)} disabled={isMutating}>
                      Editar
                    </button>
                    <button onClick={() => handleDeleteRequest(project)}
                      disabled={isMutating}
                      className="delete-button">
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {projectToDelete && (
        <ConfirmModal
          title="Confirmar Eliminación"
          message={`¿Estás seguro de que quieres eliminar el proyecto "${projectToDelete.id}"?`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

export default React.memo(ProjectsViewer);