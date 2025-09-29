import { calculateLabor } from './laborUtils';
import { calculateMaterials } from './materialsUtils';
import { calculateBudget } from './budgetUtils';

export function calculateReportSummary(reports = [], projects = [], selectedProjectId = "") {
  if (!Array.isArray(reports)) reports = [];
  if (!Array.isArray(projects)) projects = [];

  const filteredReports = selectedProjectId
    ? reports.filter(report => report.projectId === selectedProjectId)
    : reports;

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Acumuladores
  let totalLabor = 0;
  let totalMaterials = 0;
  let totalInvoiced = 0;
  let totalIncome = 0;
  
  let totalOfficialHours = 0;
  let totalWorkerHours = 0;
  
  let totalExtraBudget = 0;
  let totalExtraCost = 0;
  let totalExtraOfficialHours = 0;
  let totalExtraWorkerHours = 0;

  const weekMap = {};
  const projectMap = {};

  filteredReports.forEach(report => {
    const project = projects.find(p => p.id === report.projectId);
    
    if (!project) {
      console.warn(`Proyecto no encontrado para reporte ${report.id}`);
      return;
    }

    // IMPORTANTE: Recalcular labor siempre, no confiar en datos guardados
    const laborCalcs = calculateLabor(report.labor || {}, project);
    const materialsCalcs = calculateMaterials(report.materials || []);

    // Debug para proyectos por horas
    if (project.type === 'hourly' && !report.isExtraWork) {
      console.log('Reporte por horas:', {
        reportId: report.id,
        projectId: report.projectId,
        labor: report.labor,
        laborCalcs: laborCalcs
      });
    }

    // PROYECTOS POR HORAS - La mano de obra ES el ingreso
    if (project.type === 'hourly' && !report.isExtraWork) {
      totalOfficialHours += laborCalcs.officialHours || 0;
      totalWorkerHours += laborCalcs.workerHours || 0;
      totalLabor += laborCalcs.totalLaborCost || 0;
      totalIncome += laborCalcs.totalLaborCost || 0; // ← INGRESO = Mano de obra
      totalMaterials += materialsCalcs.totalMaterialsCost || 0;
    }

    // PROYECTOS CON PRESUPUESTO - El facturado es el ingreso
    if (project.type === 'fixed' && !report.isExtraWork) {
      totalOfficialHours += laborCalcs.officialHours || 0;
      totalWorkerHours += laborCalcs.workerHours || 0;
      totalLabor += laborCalcs.totalLaborCost || 0; // Para eficiencia
      totalInvoiced += parseFloat(report.invoicedAmount) || 0;
      totalIncome += parseFloat(report.invoicedAmount) || 0; // ← INGRESO = Facturado
      totalMaterials += materialsCalcs.totalMaterialsCost || 0;
    }

    // TRABAJOS EXTRA
    if (report.isExtraWork) {
      if (report.extraWorkType === 'additional_budget') {
        totalExtraBudget += parseFloat(report.extraBudgetAmount) || 0;
        totalIncome += parseFloat(report.extraBudgetAmount) || 0;
      } else if (report.extraWorkType === 'hourly') {
        totalExtraOfficialHours += laborCalcs.officialHours || 0;
        totalExtraWorkerHours += laborCalcs.workerHours || 0;
        totalIncome += laborCalcs.totalLaborCost || 0; // Trabajo extra por horas
      }
      totalExtraCost += materialsCalcs.totalMaterialsCost || 0;
      totalMaterials += materialsCalcs.totalMaterialsCost || 0;
    }

    // Agregar a mapa semanal
    const weekKey = `${report.weekNumber}-${new Date(report.reportDate).getFullYear()}`;
    if (!weekMap[weekKey]) {
      weekMap[weekKey] = {
        weekNumber: report.weekNumber,
        year: new Date(report.reportDate).getFullYear(),
        label: `Semana ${report.weekNumber}/${new Date(report.reportDate).getFullYear()}`,
        laborCost: 0,
        materialsCost: 0,
        totalIncome: 0,
        invoicedAmount: 0,
        officialHours: 0,
        workerHours: 0,
        extraBudget: 0,
        extraCost: 0
      };
    }

    if (project.type === 'hourly' && !report.isExtraWork) {
      weekMap[weekKey].totalIncome += laborCalcs.totalLaborCost || 0;
    } else if (project.type === 'fixed' && !report.isExtraWork) {
      weekMap[weekKey].invoicedAmount += parseFloat(report.invoicedAmount) || 0;
      weekMap[weekKey].totalIncome += parseFloat(report.invoicedAmount) || 0;
    }

    if (report.isExtraWork) {
      if (report.extraWorkType === 'additional_budget') {
        weekMap[weekKey].extraBudget += parseFloat(report.extraBudgetAmount) || 0;
        weekMap[weekKey].totalIncome += parseFloat(report.extraBudgetAmount) || 0;
      } else if (report.extraWorkType === 'hourly') {
        weekMap[weekKey].totalIncome += laborCalcs.totalLaborCost || 0;
      }
      weekMap[weekKey].extraCost += materialsCalcs.totalMaterialsCost || 0;
    }

    weekMap[weekKey].laborCost += laborCalcs.totalLaborCost || 0;
    weekMap[weekKey].materialsCost += materialsCalcs.totalMaterialsCost || 0;
    weekMap[weekKey].officialHours += laborCalcs.officialHours || 0;
    weekMap[weekKey].workerHours += laborCalcs.workerHours || 0;

    // Agregar a mapa de proyectos
    const projectKey = report.projectId;
    if (!projectMap[projectKey]) {
      projectMap[projectKey] = {
        projectId: report.projectId,
        projectClient: project.client || project.id,
        type: project.type,
        budgetAmount: project.budgetAmount || 0,
        laborCost: 0,
        materialsCost: 0,
        totalIncome: 0,
        invoicedAmount: 0,
        officialHours: 0,
        workerHours: 0,
        extraBudget: 0,
        extraCost: 0
      };
    }

    if (project.type === 'hourly' && !report.isExtraWork) {
      projectMap[projectKey].totalIncome += laborCalcs.totalLaborCost || 0;
    } else if (project.type === 'fixed' && !report.isExtraWork) {
      projectMap[projectKey].invoicedAmount += parseFloat(report.invoicedAmount) || 0;
      projectMap[projectKey].totalIncome += parseFloat(report.invoicedAmount) || 0;
    }

    if (report.isExtraWork) {
      if (report.extraWorkType === 'additional_budget') {
        projectMap[projectKey].extraBudget += parseFloat(report.extraBudgetAmount) || 0;
        projectMap[projectKey].totalIncome += parseFloat(report.extraBudgetAmount) || 0;
      } else if (report.extraWorkType === 'hourly') {
        projectMap[projectKey].totalIncome += laborCalcs.totalLaborCost || 0;
      }
      projectMap[projectKey].extraCost += materialsCalcs.totalMaterialsCost || 0;
    }

    projectMap[projectKey].laborCost += laborCalcs.totalLaborCost || 0;
    projectMap[projectKey].materialsCost += materialsCalcs.totalMaterialsCost || 0;
    projectMap[projectKey].officialHours += laborCalcs.officialHours || 0;
    projectMap[projectKey].workerHours += laborCalcs.workerHours || 0;
  });

  // Calcular presupuesto si hay proyecto seleccionado
  let budgetCalculations = {};
  if (selectedProject && selectedProject.type === 'fixed') {
    budgetCalculations = calculateBudget(selectedProject, filteredReports);
  }

  // Totales finales
  const totals = {
    totalLabor,
    totalMaterials,
    totalInvoiced,
    totalIncome, // Este es el que debe aparecer en el Dashboard
    totalCost: totalLabor + totalMaterials,
    totalOfficialHours,
    totalWorkerHours,
    totalHours: totalOfficialHours + totalWorkerHours,
    totalExtraBudget,
    totalExtraCost,
    totalExtraOfficialHours,
    totalExtraWorkerHours,
    totalExtraHours: totalExtraOfficialHours + totalExtraWorkerHours,
    grandTotal: totalIncome + totalExtraBudget,
    ...budgetCalculations
  };

  console.log('Totales calculados:', {
    totalIncome,
    totalLabor,
    totalInvoiced,
    proyectosPorHoras: filteredReports.filter(r => {
      const p = projects.find(pr => pr.id === r.projectId);
      return p?.type === 'hourly' && !r.isExtraWork;
    }).length
  });

  return {
    totals,
    byWeek: Object.values(weekMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNumber - b.weekNumber;
    }),
    byProject: Object.values(projectMap).sort((a, b) => b.totalIncome - a.totalIncome)
  };
}