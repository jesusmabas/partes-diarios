import { useMemo } from "react";

/**
 * Hook personalizado para calcular resúmenes y estadísticas de reportes
 * @param {Array} reports - Lista de reportes
 * @param {Array} projects - Lista de proyectos
 * @param {string} selectedProjectId - ID del proyecto seleccionado (opcional)
 * @returns {Object} - Objeto con cálculos y estadísticas
 */
export const useReportSummary = (reports = [], projects = [], selectedProjectId = "") => {
  // Filtrar por proyecto si es necesario
  const filteredReports = useMemo(() => {
    if (!selectedProjectId) return reports;
    return reports.filter(report => report.projectId === selectedProjectId);
  }, [reports, selectedProjectId]);

  // Obtener tipo de proyecto
  const projectType = useMemo(() => {
    if (!selectedProjectId) return null;
    const project = projects.find(p => p.id === selectedProjectId);
    return project?.type || null;
  }, [projects, selectedProjectId]);

  // Calcular totales generales
  const totals = useMemo(() => {
    let totalLabor = 0;
    let totalMaterials = 0;
    let totalCost = 0;
    let totalInvoiced = 0;
    let totalHours = 0;

    filteredReports.forEach(report => {
      // Costos de mano de obra (proyectos por hora)
      if (report.labor) {
        totalLabor += report.labor.totalLaborCost || 0;
        totalHours += (report.labor.officialHours || 0) + (report.labor.workerHours || 0);
      }
      
      // Costos de materiales
      totalMaterials += report.totalMaterialsCost || 0;
      
      // Coste total
      if (report.totalCost) {
        totalCost += report.totalCost;
      } else if (report.labor) {
        totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }

      // Para proyectos de presupuesto cerrado
      if (report.invoicedAmount) {
        totalInvoiced += report.invoicedAmount;
      }
    });

    return {
      totalLabor,
      totalMaterials,
      totalCost,
      totalInvoiced,
      totalHours
    };
  }, [filteredReports]);

  // Calcular resumen por semanas
  const weeklySummary = useMemo(() => {
    if (filteredReports.length === 0) return [];

    const weekMap = {};
    
    filteredReports.forEach(report => {
      const weekKey = `${report.weekNumber}-${new Date(report.reportDate).getFullYear()}`;
      
      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekNumber: report.weekNumber,
          year: new Date(report.reportDate).getFullYear(),
          label: `Semana ${report.weekNumber}/${new Date(report.reportDate).getFullYear()}`,
          laborCost: 0,
          materialsCost: 0,
          totalCost: 0,
          invoicedAmount: 0,
          reports: 0
        };
      }
      
      // Incrementar contadores
      weekMap[weekKey].reports += 1;
      
      // Para proyectos por hora
      if (report.labor) {
        weekMap[weekKey].laborCost += report.labor.totalLaborCost || 0;
      }
      
      weekMap[weekKey].materialsCost += report.totalMaterialsCost || 0;
      
      // Coste total
      if (report.totalCost) {
        weekMap[weekKey].totalCost += report.totalCost;
      } else if (report.labor) {
        weekMap[weekKey].totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }
      
      // Para proyectos de presupuesto cerrado
      if (report.invoicedAmount) {
        weekMap[weekKey].invoicedAmount += report.invoicedAmount;
      }
    });

    // Convertir a array y ordenar por semana/año
    return Object.values(weekMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNumber - b.weekNumber;
    });
  }, [filteredReports]);

  // Calcular presupuesto restante para proyectos de presupuesto cerrado
  const budgetSummary = useMemo(() => {
    if (projectType !== 'fixed' || !selectedProjectId) return null;
    
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return null;
    
    const budgetAmount = project.budgetAmount || 0;
    const invoicedTotal = totals.totalInvoiced;
    const remainingBudget = budgetAmount - invoicedTotal;
    const progressPercentage = budgetAmount > 0 ? (invoicedTotal / budgetAmount) * 100 : 0;
    
    return {
      budgetAmount,
      invoicedTotal,
      remainingBudget,
      progressPercentage: Math.min(progressPercentage, 100), // Limitar a 100%
      isOverBudget: remainingBudget < 0
    };
  }, [projectType, selectedProjectId, projects, totals.totalInvoiced]);

  return {
    totals,
    weeklySummary,
    budgetSummary,
    projectType,
    reportCount: filteredReports.length
  };
};

export default useReportSummary;