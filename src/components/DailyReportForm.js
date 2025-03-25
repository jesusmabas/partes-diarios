// src/components/DailyReportForm.js - Refactorizado para usar useCalculationsService
import React, { useState, useCallback } from "react";
import { useQueryProjects } from "../hooks/useQueryProjects";
import { useAddReport } from "../hooks/useQueryReports";
import { useCalculationsService } from "../hooks/useCalculationsService";
import ProjectSelector from "./ProjectSelector";
import LaborForm from "./LaborForm";
import MaterialsForm from "./MaterialsForm";
import WorkPerformedForm from "./WorkPerformedForm";
import FixedReportForm from "./FixedReportForm";
import ExtraWorkForm from "./ExtraWorkForm";
import { getWeekNumber } from "../utils/calculationUtils";
import "./ExtraWork.css";

const DailyReportForm = ({ userId }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [report, setReport] = useState({
    reportDate: new Date().toISOString().split("T")[0],
    labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
    materials: [],
    workPerformed: { description: "", photos: [], invoicedAmount: 0 },
    isExtraWork: false,
    extraWorkType: "additional_budget",
    extraBudgetAmount: 0,
    extraWorkData: {
      labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
      materials: [],
      workPerformed: { description: "", photos: [] },
      extraBudgetAmount: 0,
      extraWorkType: "additional_budget"
    }
  });
  
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Usar el hook de React Query para proyectos
  const { data: projects = [] } = useQueryProjects();
  
  // Usar el hook de React Query para añadir reportes
  const addReportMutation = useAddReport();
  
  // Usar el servicio centralizado de cálculos
  const { calculateLabor, calculateMaterials } = useCalculationsService();
  
  // Obtener los cálculos actualizados
  const laborData = calculateLabor(report.labor, selectedProject);
  const materialsData = calculateMaterials(report.materials);
  
  // Cálculos para trabajos extra
  const extraLaborData = report.isExtraWork && report.extraWorkData.extraWorkType === "hourly" 
    ? calculateLabor(report.extraWorkData.labor, selectedProject) 
    : null;
  const extraMaterialsData = report.isExtraWork && report.extraWorkData.extraWorkType === "hourly"
    ? calculateMaterials(report.extraWorkData.materials)
    : null;

  // Manejadores de cambios
  const handleDateChange = useCallback((e) => {
    setReport((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleLaborChange = useCallback((newLabor) => {
    setReport((prev) => ({ ...prev, labor: newLabor }));
  }, []);

  const handleMaterialsChange = useCallback((newMaterials) => {
    setReport((prev) => ({ ...prev, materials: newMaterials }));
  }, []);

  const handleWorkPerformedChange = useCallback((newWorkPerformed) => {
    setReport((prev) => ({ ...prev, workPerformed: { ...prev.workPerformed, ...newWorkPerformed } }));
  }, []);

  const handleInvoicedChange = useCallback((e) => {
    const value = parseFloat(e.target.value) || 0;
    setReport((prev) => ({
      ...prev,
      workPerformed: { ...prev.workPerformed, invoicedAmount: value },
    }));
  }, []);
  
  const handleExtraWorkToggle = useCallback((e) => {
    const isChecked = e.target.checked;
    setReport((prev) => ({
      ...prev,
      isExtraWork: isChecked
    }));
  }, []);
  
  const handleExtraWorkDataChange = useCallback((newData) => {
    setReport((prev) => ({
      ...prev,
      extraWorkData: newData
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !report.reportDate) {
      setErrorMessage("Por favor, completa todos los campos requeridos.");
      setSuccessMessage("");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Datos base del parte diario
      let reportData = {
        // MODIFICADO: Usar el campo id personalizado del proyecto, no firestoreId
        projectId: selectedProject.id, // Importante: debe coincidir con el campo 'id' en Firestore
        weekNumber: getWeekNumber(report.reportDate),
        reportDate: report.reportDate,
        workPerformed: report.workPerformed,
        userId: userId,
        isExtraWork: report.isExtraWork
      };

      if (selectedProject.type === "hourly") {
        // Proyecto por horas
        // Usar los datos pre-calculados del servicio centralizado
        reportData = {
          ...reportData,
          labor: { ...report.labor, ...laborData },
          materials: report.materials,
          totalMaterialsCost: materialsData.totalMaterialsCost,
          totalCost: laborData.totalLaborCost + materialsData.totalMaterialsCost,
        };
      } else if (selectedProject.type === "fixed") {
        if (!report.isExtraWork) {
          // Proyecto normal de presupuesto cerrado
          reportData = {
            ...reportData,
            invoicedAmount: report.workPerformed.invoicedAmount || 0,
          };
        } else {
          // Trabajo extra
          reportData.extraWorkType = report.extraWorkData.extraWorkType;
          
          if (report.extraWorkData.extraWorkType === "additional_budget") {
            reportData.extraBudgetAmount = report.extraWorkData.extraBudgetAmount || 0;
          } else {
            // Usar los datos pre-calculados del servicio centralizado para trabajos extra
            reportData = {
              ...reportData,
              labor: { ...report.extraWorkData.labor, ...extraLaborData },
              materials: report.extraWorkData.materials,
              totalMaterialsCost: extraMaterialsData.totalMaterialsCost,
              totalCost: extraLaborData.totalLaborCost + extraMaterialsData.totalMaterialsCost,
            };
          }
          
          reportData.workPerformed = report.extraWorkData.workPerformed;
        }
      }

      // Usar la mutación de React Query para crear el reporte
      await addReportMutation.mutateAsync(reportData);
      
      setSuccessMessage("Parte guardado correctamente!");
      
      // Resetear el formulario
      setReport({
        reportDate: new Date().toISOString().split("T")[0],
        labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
        materials: [],
        workPerformed: { description: "", photos: [], invoicedAmount: 0 },
        isExtraWork: false,
        extraWorkType: "additional_budget",
        extraBudgetAmount: 0,
        extraWorkData: {
          labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
          materials: [],
          workPerformed: { description: "", photos: [] },
          extraBudgetAmount: 0,
          extraWorkType: "additional_budget"
        }
      });
      
      setSelectedProject(null);
    } catch (err) {
      console.error("Error al guardar parte:", err);
      setErrorMessage(`Error al guardar: ${err.message}`);
    }
  };

  // Obtener el objeto proyecto completo
  const project = projects.find((p) => p.id === selectedProject?.id);
  
  // Verificar si el proyecto permite trabajos extra
  const allowsExtraWork = project?.type === "fixed" && project?.allowExtraWork;

  return (
    <form onSubmit={handleSubmit}>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      {addReportMutation.isPending && <p>Guardando parte...</p>}
      
      <ProjectSelector onProjectSelect={setSelectedProject} selectedProject={selectedProject} />
      
      {selectedProject && (
        <>
          <div className="form-group">
            <label>Fecha del parte</label>
            <input
              type="date"
              name="reportDate"
              value={report.reportDate}
              onChange={handleDateChange}
              required
            />
          </div>
          
          {allowsExtraWork && (
            <div className="form-group checkbox-group">
              <input
                id="is-extra-work"
                type="checkbox"
                name="isExtraWork"
                checked={report.isExtraWork}
                onChange={handleExtraWorkToggle}
                className="checkbox-input"
              />
              <label htmlFor="is-extra-work" className="checkbox-label">
                Es un trabajo extra fuera de presupuesto
              </label>
            </div>
          )}
          
          {/* Formularios condicionales */}
          {project.type === "hourly" ? (
            <>
              <LaborForm labor={report.labor} onLaborChange={handleLaborChange} project={selectedProject} />
              <MaterialsForm
                materials={report.materials}
                onMaterialsChange={handleMaterialsChange}
                projectId={selectedProject.id}
                reportDate={report.reportDate}
              />
              <WorkPerformedForm
                workPerformed={report.workPerformed}
                onWorkPerformedChange={handleWorkPerformedChange}
                projectId={selectedProject.id}
                reportDate={report.reportDate}
              />
            </>
          ) : (
            report.isExtraWork ? (
              <ExtraWorkForm
                extraWorkData={report.extraWorkData}
                onExtraWorkChange={handleExtraWorkDataChange}
                project={selectedProject}
                reportDate={report.reportDate}
              />
            ) : (
              <FixedReportForm
                workPerformed={report.workPerformed}
                onWorkPerformedChange={handleWorkPerformedChange}
                projectId={selectedProject.id}
                reportDate={report.reportDate}
                onInvoicedChange={handleInvoicedChange}
                invoicedAmount={report.workPerformed.invoicedAmount}
              />
            )
          )}
          
          <button type="submit" disabled={addReportMutation.isPending}>
            {addReportMutation.isPending ? "Guardando..." : "Guardar parte"}
          </button>
        </>
      )}
    </form>
  );
};

export default DailyReportForm;