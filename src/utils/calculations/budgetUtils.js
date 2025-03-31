// src/utils/calculations/budgetUtils.js

export function calculateBudget(project = {}, reports = []) {
  if (!project || typeof project !== 'object') {
    project = {};
  }
  if (!Array.isArray(reports)) {
    reports = [];
  }

  const budgetAmount = parseFloat(project.budgetAmount) || 0;
  let invoicedTotal = 0;

  if (project.type === 'fixed') {
    if (project.totalInvoicedAmount !== undefined && project.totalInvoicedAmount !== null) {
        invoicedTotal = parseFloat(project.totalInvoicedAmount) || 0;
    } else {
        console.warn(`calculateBudget: Fallback for project ${project.id}.`);
        invoicedTotal = reports
            .filter(report => report.projectId === project.id && !report.isExtraWork)
            .reduce((sum, report) => sum + (parseFloat(report.invoicedAmount) || 0), 0);
    }
  }

  const remainingBudget = budgetAmount - invoicedTotal;

  const progressPercentage = budgetAmount > 0
    ? Math.min(Math.max((invoicedTotal / budgetAmount) * 100, 0), 100)
    : 0;

  return {
    budgetAmount,
    invoicedTotal,
    remainingBudget,
    progressPercentage: parseFloat(progressPercentage.toFixed(2)),
    isOverBudget: remainingBudget < 0
  };
}