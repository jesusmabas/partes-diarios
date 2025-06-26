// src/utils/calculations/reportSummaryUtils.js
import { calculateLabor } from './laborUtils';
import { calculateMaterials } from './materialsUtils';
import { calculateBudget } from './budgetUtils'; 

/**
 * Calcula un resumen completo de los reportes, incluyendo costes, ingresos y horas desglosadas.
 * Esta función es ahora autónoma y realiza todos los cálculos necesarios internamente.
 *
 * @param {Array} reports - Lista de objetos de reporte "crudos" de Firestore.
 * @param {Array} projects - Lista de objetos de proyecto.
 * @param {string} [selectedProjectId=""] - ID del proyecto para filtrar (opcional).
 * @returns {Object} Un objeto con totales generales (`totals`), resumen por semana (`byWeek`), y resumen por proyecto (`byProject`).
 */
export function calculateReportSummary(reports = [], projects = [], selectedProjectId = "") {
  if (!Array.isArray(reports)) reports = [];
  if (!Array.isArray(projects)) projects = [];

  const filteredReports = selectedProjectId
    ? reports.filter(report => report.projectId === selectedProjectId)
    : reports;

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Acumuladores para costes y facturación
  let totalLabor = 0;
  let totalMaterials = 0;
  let totalCost = 0;
  let totalInvoiced = 0;
  
  // --- CAMBIO: SEPARACIÓN DE HORAS ---
  // Horas de trabajo normal (control interno para 'fixed' o facturables para 'hourly')
  let totalOfficialHours = 0;
  let totalWorkerHours = 0;
  
  // Acumuladores para trabajos extra
  let totalExtraBudget = 0;
  let totalExtraLaborCost = 0;
  let totalExtraMaterialsCost = 0;
  // Horas específicas para trabajos extra por horas
  let totalExtraOfficialHours = 0; 
  let totalExtraWorkerHours = 0;

  filteredReports.forEach(report => {
    const project = projects.find(p => p.id === report.projectId);
    if (!project) return;

    const laborCalcs = calculateLabor(report.labor, project);
    const materialsCalcs = calculateMaterials(report.materials);
    const reportTotalCost = laborCalcs.totalLaborCost + materialsCalcs.totalMaterialsCost;

    if (report.isExtraWork && project.type === 'fixed') {
      if (report.extraWorkType === 'hourly') {
        // Acumular costes y horas en los contadores de "extras"
        totalExtraLaborCost += laborCalcs.totalLaborCost;
        totalExtraMaterialsCost += materialsCalcs.totalMaterialsCost;
        totalExtraOfficialHours += laborCalcs.officialHours || 0;
        totalExtraWorkerHours += laborCalcs.workerHours || 0;
      } else if (report.extraWorkType === 'additional_budget') {
        totalExtraBudget += parseFloat(report.extraBudgetAmount) || 0;
      }
    } else {
      // Es un trabajo normal (sea 'hourly' o 'fixed')
      // Acumular horas en los contadores "normales"
      totalOfficialHours += laborCalcs.officialHours || 0;
      totalWorkerHours += laborCalcs.workerHours || 0;
      
      // Los costes solo se acumulan para proyectos 'hourly'
      if (project.type === 'hourly') {
          totalLabor += laborCalcs.totalLaborCost;
          totalMaterials += materialsCalcs.totalMaterialsCost;
          totalCost += reportTotalCost;
      } else if (project.type === 'fixed') {
        totalInvoiced += parseFloat(report.invoicedAmount) || 0;
      }
    }
  });
  
  // El total de horas de trabajo ahora es la suma de las horas normales
  const totalHours = totalOfficialHours + totalWorkerHours;
  // El total de horas extra
  const totalExtraHours = totalExtraOfficialHours + totalExtraWorkerHours;

  const totalIncome = totalInvoiced + totalExtraBudget + totalExtraLaborCost;
  const grandTotal = totalInvoiced + totalExtraBudget + totalExtraLaborCost;

  let budgetCalculations = {};
  if (selectedProject && selectedProject.type === 'fixed') {
      budgetCalculations = calculateBudget(selectedProject, filteredReports);
  }

  // Devolvemos todos los acumuladores, ahora separados
  return {
    totals: {
      totalLabor,
      totalMaterials,
      totalCost,
      totalInvoiced,
      totalHours, // Horas de trabajo normal/presupuestado
      totalOfficialHours, // Horas de oficial normales/presupuestadas
      totalWorkerHours, // Horas de peón normales/presupuestadas
      totalIncome,
      totalExtraBudget,
      totalExtraCost: totalExtraLaborCost + totalExtraMaterialsCost,
      totalExtraLaborCost,
      totalExtraMaterialsCost,
      totalExtraHours, // Total de horas extra
      totalExtraOfficialHours, // Horas de oficial extra
      totalExtraWorkerHours, // Horas de peón extra
      grandTotal,
      ...budgetCalculations,
    },
    byWeek: [],
    byProject: []
  };
}