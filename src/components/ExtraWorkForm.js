// src/components/ExtraWorkForm.js - Refactorizado para usar useCalculationsService

import React, { useState, useCallback } from "react";
import { formatCurrency } from "../utils/calculationUtils";
import { useCalculationsService } from "../hooks/useCalculationsService";
import LaborForm from "./LaborForm";
import MaterialsForm from "./MaterialsForm";
import WorkPerformedForm from "./WorkPerformedForm";
import "./ExtraWork.css"; // Importar el archivo CSS


/**
 * Componente para gestionar trabajos extra en proyectos de presupuesto cerrado
 * 
 * @param {Object} props 
 * @param {Object} props.extraWorkData - Datos del trabajo extra
 * @param {Function} props.onExtraWorkChange - Función que se ejecuta al cambiar los datos
 * @param {Object} props.project - Proyecto al que pertenece el trabajo extra
 * @param {string} props.reportDate - Fecha del parte diario
 */
const ExtraWorkForm = ({ 
  extraWorkData, 
  onExtraWorkChange, 
  project, 
  reportDate 
}) => {
  // Estado local para el tipo de trabajo extra
  const [extraWorkType, setExtraWorkType] = useState(extraWorkData.extraWorkType || "additional_budget");
  
  // Usamos el servicio centralizado de cálculos
  const { calculateLabor, calculateMaterials } = useCalculationsService();
  
  // Calculamos datos de labor y materiales
  const laborCalcs = calculateLabor(extraWorkData.labor, project);
  const materialsCalcs = calculateMaterials(extraWorkData.materials);
  
  // Total para trabajos extra por hora
  const extraWorkTotal = extraWorkType === "hourly" 
    ? laborCalcs.totalLaborCost + materialsCalcs.totalMaterialsCost
    : extraWorkData.extraBudgetAmount || 0;
  
  // Handler para cambio de tipo de trabajo extra
  const handleExtraWorkTypeChange = useCallback((e) => {
    const newType = e.target.value;
    setExtraWorkType(newType);
    
    // Actualizar datos según el nuevo tipo
    onExtraWorkChange({
      ...extraWorkData,
      extraWorkType: newType,
    });
  }, [extraWorkData, onExtraWorkChange]);

  // Handler para cambio de importe adicional
  const handleExtraBudgetChange = useCallback((e) => {
    const value = parseFloat(e.target.value) || 0;
    onExtraWorkChange({
      ...extraWorkData,
      extraBudgetAmount: value
    });
  }, [extraWorkData, onExtraWorkChange]);

  // Handler para cambios en la mano de obra
  const handleLaborChange = useCallback((labor) => {
    onExtraWorkChange({
      ...extraWorkData,
      labor
    });
  }, [extraWorkData, onExtraWorkChange]);

  // Handler para cambios en materiales
  const handleMaterialsChange = useCallback((materials) => {
    onExtraWorkChange({
      ...extraWorkData,
      materials
    });
  }, [extraWorkData, onExtraWorkChange]);

  // Handler para cambios en el trabajo realizado
  const handleWorkPerformedChange = useCallback((workPerformed) => {
    onExtraWorkChange({
      ...extraWorkData,
      workPerformed: {
        ...extraWorkData.workPerformed,
        ...workPerformed
      }
    });
  }, [extraWorkData, onExtraWorkChange]);

  return (
    <div className="extra-work-form">
      <h3>Trabajos Extra (Fuera de Presupuesto)</h3>
      
      <div className="form-group">
        <label>Tipo de facturación para trabajo extra:</label>
        <div className="radio-group">
          <div className="radio-option">
            <input 
              type="radio"
              id="extra-type-budget"
              name="extraWorkType"
              value="additional_budget"
              checked={extraWorkType === "additional_budget"}
              onChange={handleExtraWorkTypeChange}
            />
            <label htmlFor="extra-type-budget">Presupuesto adicional</label>
          </div>
          
          <div className="radio-option">
            <input 
              type="radio"
              id="extra-type-hourly"
              name="extraWorkType"
              value="hourly"
              checked={extraWorkType === "hourly"}
              onChange={handleExtraWorkTypeChange}
            />
            <label htmlFor="extra-type-hourly">Por horas</label>
          </div>
        </div>
      </div>
      
      {extraWorkType === "additional_budget" ? (
        <div className="form-group">
          <label htmlFor="extra-budget-amount">Importe adicional presupuestado (€)</label>
          <input
            id="extra-budget-amount"
            type="number"
            value={extraWorkData.extraBudgetAmount || 0}
            onChange={handleExtraBudgetChange}
            min="0"
            step="0.01"
          />
          {extraWorkData.extraBudgetAmount > 0 && (
            <p className="form-hint">Importe adicional: {formatCurrency(extraWorkData.extraBudgetAmount)}</p>
          )}
        </div>
      ) : (
        // Mostrar formularios para trabajo por horas
        <>
          <LaborForm 
            labor={extraWorkData.labor || { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" }} 
            onLaborChange={handleLaborChange} 
            project={project} 
          />
          
          <MaterialsForm
            materials={extraWorkData.materials || []}
            onMaterialsChange={handleMaterialsChange}
            projectId={project.id}
            reportDate={reportDate}
          />
          
          {/* Mostrar el total calculado para trabajo por horas */}
          {extraWorkType === "hourly" && (
            <div className="extra-work-total">
              <p className="total-summary">
                <strong>Total trabajo extra por horas:</strong> {formatCurrency(extraWorkTotal)}
              </p>
            </div>
          )}
        </>
      )}
      
      {/* Trabajo realizado (siempre visible) */}
      <WorkPerformedForm
        workPerformed={extraWorkData.workPerformed || { description: "", photos: [] }}
        onWorkPerformedChange={handleWorkPerformedChange}
        projectId={project.id}
        reportDate={reportDate}
      />
    </div>
  );
};

export default React.memo(ExtraWorkForm);