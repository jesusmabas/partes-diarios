// src/utils/calculations/budgetUtils.js

/**
 * Calcula el presupuesto de un proyecto, considerando correctamente los trabajos extra.
 *
 * @param {Object} project - El objeto del proyecto, que contiene el presupuesto original.
 * @param {Array} reports - La lista de todos los reportes (normales y extra) asociados al proyecto.
 * @returns {Object} Un objeto con los detalles del presupuesto desglosado.
 */
export function calculateBudget(project = {}, reports = []) {
  // Asegurar que los inputs sean válidos para evitar errores
  if (!project || typeof project !== 'object') {
    project = {};
  }
  if (!Array.isArray(reports)) {
    reports = [];
  }

  const originalBudgetAmount = parseFloat(project.budgetAmount) || 0;
  let invoicedTotal = 0; // Acumula solo lo facturado contra el presupuesto original
  let totalExtraWorkIncome = 0; // Acumula todos los ingresos de trabajos extra

  // Filtrar reportes para asegurarse de que solo se procesan los del proyecto actual
  const projectReports = reports.filter(report => report.projectId === project.id);

  projectReports.forEach(report => {
    if (report.isExtraWork) {
      // Si es un trabajo extra, su valor se suma a los ingresos por extras
      if (report.extraWorkType === 'additional_budget') {
        totalExtraWorkIncome += parseFloat(report.extraBudgetAmount) || 0;
      } else if (report.extraWorkType === 'hourly') {
        // Para extras por horas, el ingreso es el coste de la mano de obra
        totalExtraWorkIncome += parseFloat(report.labor?.totalLaborCost) || 0;
      }
    } else {
      // Si es un parte normal, su importe se suma a lo facturado del presupuesto
      invoicedTotal += parseFloat(report.invoicedAmount) || 0;
    }
  });

  // **LÓGICA CORREGIDA**: El presupuesto total es el original más los ingresos de los extras.
  const totalBudgetWithExtras = originalBudgetAmount + totalExtraWorkIncome;

  // **LÓGICA CORREGIDA**: El restante se calcula sobre este nuevo presupuesto total.
  // Se resta lo que se ha facturado del presupuesto principal.
  const remainingBudget = totalBudgetWithExtras - invoicedTotal;

  // El progreso se calcula sobre el presupuesto total (con extras), reflejando el avance real.
  const progressPercentage = totalBudgetWithExtras > 0
    ? Math.min(Math.max((invoicedTotal / totalBudgetWithExtras) * 100, 0), 100)
    : 0;

  // Devolver un objeto completo y claro con todos los valores calculados
  return {
    budgetAmount: originalBudgetAmount, // El presupuesto original sin extras
    totalBudgetWithExtras,             // El "bote" total del proyecto
    totalExtraWorkIncome,              // El valor total de todos los trabajos extra
    invoicedTotal,                     // Lo que se ha facturado del presupuesto principal
    remainingBudget,                   // Lo que queda en el "bote" total
    progressPercentage: parseFloat(progressPercentage.toFixed(2)),
    isOverBudget: remainingBudget < 0
  };
}