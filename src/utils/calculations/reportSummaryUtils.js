// src/utils/calculations/reportSummaryUtils.js
import { calculateLabor } from './laborUtils';
import { calculateMaterials } from './materialsUtils';
// --- IMPORTACIÓN AÑADIDA ---
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
  // Asegurar que los inputs sean arrays para evitar errores
  if (!Array.isArray(reports)) reports = [];
  if (!Array.isArray(projects)) projects = [];

  // Filtrar reportes si se especifica un proyecto
  const filteredReports = selectedProjectId
    ? reports.filter(report => report.projectId === selectedProjectId)
    : reports;

  // Obtener el proyecto seleccionado para los cálculos de presupuesto
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Inicializar acumuladores de totales generales
  let totalLabor = 0;
  let totalMaterials = 0;
  let totalCost = 0;
  let totalHours = 0;
  let totalOfficialHours = 0;
  let totalWorkerHours = 0;
  let totalInvoiced = 0;
  let totalExtraBudget = 0;
  let totalExtraLaborCost = 0;
  let totalExtraMaterialsCost = 0;
  let totalExtraOfficialHours = 0;
  let totalExtraWorkerHours = 0;

  // Iterar sobre cada reporte filtrado para calcular y acumular
  filteredReports.forEach(report => {
    const project = projects.find(p => p.id === report.projectId);
    if (!project) return; // Si no se encuentra el proyecto, se omite el reporte.

    const laborCalcs = calculateLabor(report.labor, project);
    const materialsCalcs = calculateMaterials(report.materials);
    const reportTotalCost = laborCalcs.totalLaborCost + materialsCalcs.totalMaterialsCost;

    totalOfficialHours += laborCalcs.officialHours;
    totalWorkerHours += laborCalcs.workerHours;
    totalHours += laborCalcs.officialHours + laborCalcs.workerHours;

    if (report.isExtraWork && project.type === 'fixed') {
      if (report.extraWorkType === 'hourly') {
        totalExtraLaborCost += laborCalcs.totalLaborCost;
        totalExtraMaterialsCost += materialsCalcs.totalMaterialsCost;
        totalExtraOfficialHours += laborCalcs.officialHours;
        totalExtraWorkerHours += laborCalcs.workerHours;
      } else if (report.extraWorkType === 'additional_budget') {
        totalExtraBudget += parseFloat(report.extraBudgetAmount) || 0;
      }
    } else {
      totalLabor += laborCalcs.totalLaborCost;
      totalMaterials += materialsCalcs.totalMaterialsCost;
      totalCost += reportTotalCost;
      if (project.type === 'fixed') {
        totalInvoiced += parseFloat(report.invoicedAmount) || 0;
      }
    }
  });

  const totalIncome = totalInvoiced + totalExtraBudget + totalExtraLaborCost;
  const grandTotal = totalInvoiced + totalExtraBudget + totalExtraLaborCost;

  // --- LÓGICA DE PRESUPUESTO CENTRALIZADA ---
  // Usamos la función de `budgetUtils` para obtener los cálculos de presupuesto correctos.
  // Solo la llamamos si hay un proyecto de tipo 'fixed' seleccionado.
  let budgetCalculations = {};
  if (selectedProject && selectedProject.type === 'fixed') {
      // Pasamos el proyecto y los reportes filtrados para obtener el resumen del presupuesto
      budgetCalculations = calculateBudget(selectedProject, filteredReports);
  }

  return {
    totals: {
      totalLabor,
      totalMaterials,
      totalCost,
      totalInvoiced,
      totalHours,
      totalOfficialHours,
      totalWorkerHours,
      totalIncome,
      totalExtraBudget,
      totalExtraCost: totalExtraLaborCost + totalExtraMaterialsCost,
      totalExtraLaborCost,
      totalExtraMaterialsCost,
      totalExtraOfficialHours,
      totalExtraWorkerHours,
      grandTotal,
      // --- VALORES AÑADIDOS DESDE BUDGETUTILS ---
      ...budgetCalculations,
    },
    // Mantengo los arrays vacíos para no romper la estructura, pero la lógica de agrupación se debería implementar aquí.
    byWeek: [],
    byProject: []
  };
}