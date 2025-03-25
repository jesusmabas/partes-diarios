// src/utils/calculations/extraWorkUtils.js

/**
 * Calcula los datos relacionados con trabajos extra
 *
 * @param {Array} reports - Lista de reportes
 * @param {Object} project - Datos del proyecto
 * @returns {Object} Resultados de los cálculos de trabajos extra
 */
export function calculateExtraWork(reports = [], project = {}) {
  if (!reports || !Array.isArray(reports) || !project) {
    return {
      totalExtraBudget: 0,
      totalExtraLaborCost: 0, // Renamed for clarity
      totalExtraMaterials: 0,
      totalExtraCost: 0,
      totalExtra: 0,
      extraWorkCount: 0,
      extraWorkReports: []
    };
  }

  // Filtrar reportes de trabajos extra para este proyecto
  const extraWorkReports = reports.filter(
    report => report.projectId === project.id && report.isExtraWork
  );

  let totalExtraBudget = 0;
  let totalExtraLaborCost = 0; // Renamed for clarity
  let totalExtraMaterials = 0;
  let totalExtraCost = 0;

  // Calcular totales para cada tipo de trabajo extra
  extraWorkReports.forEach(report => {
    if (report.extraWorkType === 'additional_budget') {
      totalExtraBudget += report.extraBudgetAmount || 0;
    } else if (report.extraWorkType === 'hourly') {
      // More thorough check for labor.totalLaborCost
      // Check both direct totalLaborCost on report or in report.labor
      const laborCost = report.totalLaborCost || (report.labor && report.labor.totalLaborCost) || 0;
      const materialsCost = report.totalMaterialsCost || 0;

      totalExtraLaborCost += laborCost; // Use the renamed variable
      totalExtraMaterials += materialsCost;
      totalExtraCost += report.totalCost || laborCost + materialsCost; // Consider totalCost at the root of the report
    }
  });

  const totalExtra = totalExtraBudget + totalExtraCost;

  return {
    totalExtraBudget,
    totalExtraLaborCost, // Renamed for clarity
    totalExtraMaterials,
    totalExtraCost,
    totalExtra,
    extraWorkCount: extraWorkReports.length,
    extraWorkReports
  };
}