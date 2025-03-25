// src/hooks/useCalculationsService.js - Versión refactorizada
import { useMemo } from 'react';

// Importar funciones de utilidad puras
import { calculateLabor } from '../utils/calculations/laborUtils';
import { calculateMaterials } from '../utils/calculations/materialsUtils';
import { calculateBudget } from '../utils/calculations/budgetUtils';
import { calculateExtraWork } from '../utils/calculations/extraWorkUtils';
import { calculateReportSummary } from '../utils/calculations/reportSummaryUtils';

/**
 * Hook principal que centraliza todos los servicios de cálculo
 * 
 * Este hook es el punto de entrada único para todos los cálculos de la aplicación.
 * Proporciona una API unificada para acceder a todos los cálculos necesarios,
 * eliminando la duplicación de lógica y garantizando consistencia.
 * 
 * @returns {Object} API de servicios de cálculo
 */
export const useCalculationsService = () => {
  // Usar useMemo para garantizar la estabilidad de referencia del servicio
  const calculationService = useMemo(() => {
    /**
     * Calcula el coste total de un reporte
     * 
     * @param {Object} report - Datos del reporte
     * @param {Object} project - Datos del proyecto
     * @returns {number} Coste total calculado
     */
    const calculateReportTotalCost = (report, project) => {
      if (!report || !project) return 0;

      if (project.type === 'hourly' || (report.isExtraWork && report.extraWorkType === 'hourly')) {
        const laborResult = calculateLabor(report.labor, project);
        const materialsResult = calculateMaterials(report.materials);
        
        return laborResult.totalLaborCost + materialsResult.totalMaterialsCost;
      } else if (report.isExtraWork && report.extraWorkType === 'additional_budget') {
        return report.extraBudgetAmount || 0;
      } else {
        return report.invoicedAmount || 0;
      }
    };

    /**
     * Calcula los ingresos totales de un reporte
     * 
     * @param {Object} report - Datos del reporte
     * @param {Object} project - Datos del proyecto
     * @returns {number} Ingresos totales calculados
     */
    const calculateReportTotalIncome = (report, project) => {
      if (!report || !project) return 0;

      // Para proyectos por horas, los ingresos son la mano de obra
      if (project.type === 'hourly') {
        const laborResult = calculateLabor(report.labor, project);
        return laborResult.totalLaborCost;
      } 
      // Para trabajos extra por horas, también son la mano de obra
      else if (report.isExtraWork && report.extraWorkType === 'hourly') {
        const laborResult = calculateLabor(report.labor, project);
        return laborResult.totalLaborCost;
      } 
      // Para trabajos extra con presupuesto adicional, es el importe adicional
      else if (report.isExtraWork && report.extraWorkType === 'additional_budget') {
        return report.extraBudgetAmount || 0;
      } 
      // Para proyectos de presupuesto cerrado, son los importes facturados
      else {
        return report.invoicedAmount || 0;
      }
    };

    // Devolver la API completa del servicio de cálculos
    return {
      // Exponer directamente las funciones de utilidad importadas
      calculateLabor,
      calculateMaterials,
      calculateBudget,
      calculateExtraWork,
      calculateReportSummary,
      
      // Funciones adicionales específicas de este servicio
      calculateReportTotalCost,
      calculateReportTotalIncome
    };
  }, []);

  return calculationService;
};