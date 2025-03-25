// src/utils/calculations/budgetUtils.js

/**
 * Calcula los datos relacionados con presupuestos
 * 
 * @param {Object} project - Datos del proyecto (presupuesto)
 * @param {Array} reports - Lista de reportes con importes facturados
 * @returns {Object} Resultados de los cálculos de presupuesto
 */
export function calculateBudget(project = {}, reports = []) {
  if (!project || !reports || !Array.isArray(reports)) {
    return {
      budgetAmount: 0,
      invoicedTotal: 0,
      remainingBudget: 0,
      progressPercentage: 0,
      isOverBudget: false
    };
  }

  const budgetAmount = project.budgetAmount || 0;
  
  // Calcular total facturado (solo para reportes que no son trabajo extra)
  const invoicedTotal = reports
    .filter(report => report.projectId === project.id && !report.isExtraWork)
    .reduce((sum, report) => sum + (report.invoicedAmount || 0), 0);
  
  // Calcular presupuesto restante
  const remainingBudget = budgetAmount - invoicedTotal;
  
  // Calcular porcentaje de progreso
  const progressPercentage = budgetAmount > 0 
    ? Math.min((invoicedTotal / budgetAmount) * 100, 100) 
    : 0;
  
  return {
    budgetAmount,
    invoicedTotal,
    remainingBudget,
    progressPercentage,
    isOverBudget: remainingBudget < 0
  };
}