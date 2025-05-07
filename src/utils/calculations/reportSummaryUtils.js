// src/utils/calculations/reportSummaryUtils.js

/**
 * Calcula un resumen completo de los reportes, incluyendo costes, ingresos y horas desglosadas.
 *
 * @param {Array} reports - Lista de objetos de reporte.
 * @param {Array} projects - Lista de objetos de proyecto.
 * @param {string} [selectedProjectId=""] - ID del proyecto para filtrar (opcional).
 * @returns {Object} Un objeto con totales generales (`totals`), resumen por semana (`byWeek`), y resumen por proyecto (`byProject`).
 */
export function calculateReportSummary(reports = [], projects = [], selectedProjectId = "") {
  // Asegurar que los inputs sean arrays
  if (!Array.isArray(reports)) reports = [];
  if (!Array.isArray(projects)) projects = [];

  // Filtrar reportes si se especifica un proyecto
  const filteredReports = selectedProjectId
    ? reports.filter(report => report.projectId === selectedProjectId)
    : reports;

  // Inicializar acumuladores de totales generales
  let totalLabor = 0;
  let totalMaterials = 0;
  let totalCost = 0; // Costo general (MO+Mat para hourly, no aplica directo para fixed)
  let totalHours = 0; // Horas totales (Oficial + Peón)
  let totalOfficialHours = 0; // Horas totales de Oficial
  let totalWorkerHours = 0;   // Horas totales de Peón
  let totalIncome = 0; // Ingresos totales (depende del tipo de proyecto y extras)
  let totalInvoiced = 0; // Total facturado (solo para proyectos 'fixed' normales)
  let totalExtraBudget = 0; // Total de presupuestos adicionales para trabajos extra
  let totalExtraCost = 0; // Costo total de trabajos extra por horas (MO + Mat)
  let totalExtraLaborCost = 0; // Costo de MO de trabajos extra por horas
  let totalExtraMaterialsCost = 0; // Costo de Materiales de trabajos extra por horas
  let totalExtraOfficialHours = 0; // Horas Oficial de trabajos extra por horas
  let totalExtraWorkerHours = 0; // Horas Peón de trabajos extra por horas

  // Acumuladores para desgloses
  const reportsByWeek = {};
  const reportsByProject = {};
  const processedProjectIds = new Set(); // Para asegurar que calculamos el totalInvoiced por proyecto una vez

  // Iterar sobre cada reporte filtrado
  filteredReports.forEach(report => {
    const project = projects.find(p => p.id === report.projectId);
    const projectType = project?.type || 'hourly'; // Asumir 'hourly' si no se encuentra proyecto
    const isExtraWork = report.isExtraWork ?? false;

    // --- Acumular Horas ---
    let reportOfficialHours = 0;
    let reportWorkerHours = 0;
    if (report.labor) {
        reportOfficialHours = parseFloat(report.labor.officialHours) || 0;
        reportWorkerHours = parseFloat(report.labor.workerHours) || 0;
    }

    // Sumar a totales generales de horas (incluyendo extras por horas)
    totalOfficialHours += reportOfficialHours;
    totalWorkerHours += reportWorkerHours;
    totalHours += reportOfficialHours + reportWorkerHours;

    // Sumar a horas específicas de trabajos extra por horas
    if (isExtraWork && report.extraWorkType === 'hourly') {
        totalExtraOfficialHours += reportOfficialHours;
        totalExtraWorkerHours += reportWorkerHours;
    }

    // --- Acumular Costos e Ingresos ---
    if (isExtraWork && projectType === 'fixed') {
      // Trabajo Extra en proyecto de presupuesto cerrado
      if (report.extraWorkType === 'hourly') {
        const extraLabor = parseFloat(report.labor?.totalLaborCost) || 0;
        const extraMats = parseFloat(report.totalMaterialsCost) || 0;
        const extraRepCost = parseFloat(report.totalCost) || (extraLabor + extraMats); // Usar totalCost si existe, sino calcular
        totalExtraCost += extraRepCost;
        totalExtraLaborCost += extraLabor;
        totalExtraMaterialsCost += extraMats;
        totalIncome += extraLabor; // Ingreso en extra por horas es la mano de obra
      } else if (report.extraWorkType === 'additional_budget') {
        const extraBudget = parseFloat(report.extraBudgetAmount) || 0;
        totalExtraBudget += extraBudget;
        totalIncome += extraBudget; // Ingreso en extra por presupuesto es el propio presupuesto
      }
    } else if (!isExtraWork) {
      // Trabajo Normal (no extra)
      const laborCost = parseFloat(report.labor?.totalLaborCost) || 0;
      const materialsCost = parseFloat(report.totalMaterialsCost) || 0;
      const reportCost = parseFloat(report.totalCost) || (laborCost + materialsCost); // Usar totalCost si existe

      totalLabor += laborCost;
      totalMaterials += materialsCost;
      totalCost += reportCost; // Acumula el costo del reporte (MO+Mat para hourly)

      if (projectType === 'hourly') {
        totalIncome += laborCost; // Ingreso en proyecto por horas es la mano de obra
      }
      // El totalInvoiced se calculará después por proyecto para 'fixed'
    }

    // --- Acumular por Semana ---
    const reportDateObj = report.reportDate ? new Date(report.reportDate) : null;
    if (reportDateObj && report.weekNumber) {
      const year = reportDateObj.getFullYear();
      const weekKey = `${report.weekNumber}-${year}`;
      if (!reportsByWeek[weekKey]) {
        reportsByWeek[weekKey] = {
          weekNumber: report.weekNumber, year: year, weekLabel: `Sem ${report.weekNumber}/${year}`,
          laborCost: 0, materialsCost: 0, totalCost: 0, invoicedAmount: 0, totalIncome: 0,
          officialHours: 0, workerHours: 0, // Horas por semana
          extraBudget: 0, extraCost: 0,
          count: 0
        };
      }
      reportsByWeek[weekKey].count += 1;
      reportsByWeek[weekKey].officialHours += reportOfficialHours; // Sumar horas por semana
      reportsByWeek[weekKey].workerHours += reportWorkerHours;   // Sumar horas por semana

      if (isExtraWork && projectType === 'fixed') {
        if (report.extraWorkType === 'hourly') {
          const extraRepCostW = parseFloat(report.totalCost) || (parseFloat(report.labor?.totalLaborCost) || 0) + (parseFloat(report.totalMaterialsCost) || 0);
          reportsByWeek[weekKey].extraCost += extraRepCostW;
          reportsByWeek[weekKey].totalIncome += parseFloat(report.labor?.totalLaborCost) || 0;
        } else if (report.extraWorkType === 'additional_budget') {
          const extraBudgetW = parseFloat(report.extraBudgetAmount) || 0;
          reportsByWeek[weekKey].extraBudget += extraBudgetW;
          reportsByWeek[weekKey].totalIncome += extraBudgetW;
        }
      } else if (!isExtraWork) {
        const laborCostW = parseFloat(report.labor?.totalLaborCost) || 0;
        const materialsCostW = parseFloat(report.totalMaterialsCost) || 0;
        const reportCostW = parseFloat(report.totalCost) || (laborCostW + materialsCostW);
        reportsByWeek[weekKey].laborCost += laborCostW;
        reportsByWeek[weekKey].materialsCost += materialsCostW;
        reportsByWeek[weekKey].totalCost += reportCostW;
        if (projectType === 'hourly') {
          reportsByWeek[weekKey].totalIncome += laborCostW;
        } else if (projectType === 'fixed') {
          const invoicedW = parseFloat(report.invoicedAmount) || 0;
          reportsByWeek[weekKey].invoicedAmount += invoicedW; // Acumular facturado por semana (para fixed)
          // El totalIncome semanal para fixed se ajustará después si usamos el total del proyecto
        }
      }
    }

    // --- Acumular por Proyecto ---
    const projectId = report.projectId;
    processedProjectIds.add(projectId); // Marcar proyecto como procesado
    if (!reportsByProject[projectId]) {
      reportsByProject[projectId] = {
        projectId: projectId, client: project?.client || 'Desconocido', type: projectType, projectData: project, // Guardar datos del proyecto temporalmente
        laborCost: 0, materialsCost: 0, totalCost: 0, invoicedAmount: 0, totalIncome: 0,
        officialHours: 0, workerHours: 0, // Horas por proyecto
        extraBudget: 0, extraCost: 0, extraOfficialHours: 0, extraWorkerHours: 0, // Extras por proyecto
        count: 0, reports: 0
      };
    }
    reportsByProject[projectId].count += 1;
    reportsByProject[projectId].reports += 1;
    reportsByProject[projectId].officialHours += reportOfficialHours; // Sumar horas por proyecto
    reportsByProject[projectId].workerHours += reportWorkerHours;   // Sumar horas por proyecto

    if (isExtraWork && projectType === 'fixed') {
      if (report.extraWorkType === 'hourly') {
        const extraRepCostP = parseFloat(report.totalCost) || (parseFloat(report.labor?.totalLaborCost) || 0) + (parseFloat(report.totalMaterialsCost) || 0);
        reportsByProject[projectId].extraCost += extraRepCostP;
        reportsByProject[projectId].extraOfficialHours += reportOfficialHours;
        reportsByProject[projectId].extraWorkerHours += reportWorkerHours;
      } else if (report.extraWorkType === 'additional_budget') {
        reportsByProject[projectId].extraBudget += parseFloat(report.extraBudgetAmount) || 0;
      }
    } else if (!isExtraWork) {
      reportsByProject[projectId].laborCost += parseFloat(report.labor?.totalLaborCost) || 0;
      reportsByProject[projectId].materialsCost += parseFloat(report.totalMaterialsCost) || 0;
      const reportCostP = parseFloat(report.totalCost) || (parseFloat(report.labor?.totalLaborCost) || 0) + (parseFloat(report.totalMaterialsCost) || 0);
      reportsByProject[projectId].totalCost += reportCostP;
      // invoicedAmount y totalIncome por proyecto se calculan después
    }
  });

  // --- Calcular Totales Finales por Proyecto y Globales ---
  let grandTotalInvoiced = 0; // Total facturado global (solo de partes normales 'fixed')

  Object.keys(reportsByProject).forEach(pid => {
    const projSummary = reportsByProject[pid];
    const projData = projSummary.projectData; // Recuperar datos del proyecto

    if (projSummary.type === 'fixed') {
      // Usar el totalInvoicedAmount precalculado del proyecto si existe, si no, sumar los reportes (fallback)
      const projectTotalInvoiced = (projData && projData.totalInvoicedAmount !== undefined && projData.totalInvoicedAmount !== null)
        ? parseFloat(projData.totalInvoicedAmount) || 0
        : filteredReports
            .filter(r => r.projectId === pid && !r.isExtraWork)
            .reduce((sum, r) => sum + (parseFloat(r.invoicedAmount) || 0), 0);

      projSummary.invoicedAmount = projectTotalInvoiced;
      projSummary.totalIncome = projectTotalInvoiced; // Ingreso base es lo facturado
      grandTotalInvoiced += projectTotalInvoiced; // Sumar al total global facturado
    } else if (projSummary.type === 'hourly') {
      projSummary.totalIncome = projSummary.laborCost; // Ingreso base es la mano de obra
      projSummary.invoicedAmount = 0; // No hay facturado directo en partes por hora
    }

    // Añadir ingresos de trabajos extra al totalIncome del proyecto
    projSummary.totalIncome += projSummary.extraBudget; // Sumar presupuestos extra
    // Sumar mano de obra de trabajos extra por horas (el ingreso es la MO)
    projSummary.totalIncome += reportsByProject[pid].extraLaborCost || 0; // Necesitaríamos calcular y guardar extraLaborCost por proyecto si no lo hicimos antes


    // Limpiar datos temporales del proyecto
    delete projSummary.projectData;
  });

  // Recalcular el totalIncome global sumando los ingresos de cada proyecto
  totalIncome = Object.values(reportsByProject).reduce((sum, proj) => sum + proj.totalIncome, 0);

  // Ordenar resultados
  const byWeek = Object.values(reportsByWeek).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.weekNumber - b.weekNumber;
  });

  const byProject = Object.values(reportsByProject).sort((a, b) => {
    // Ordenar por ingreso total (incluyendo extras) descendente
    return (b.totalIncome) - (a.totalIncome);
  });

  // Devolver el objeto de resumen completo
  return {
    totals: {
      totalLabor,
      totalMaterials,
      totalCost, // Costo acumulado (principalmente relevante para 'hourly')
      totalInvoiced: grandTotalInvoiced, // Facturado total (solo de partes normales 'fixed')
      totalHours, // Horas totales (Oficial + Peón, incluyendo extras)
      totalOfficialHours, // Horas Oficial totales (incluyendo extras)
      totalWorkerHours,   // Horas Peón totales (incluyendo extras)
      totalIncome, // Ingreso total calculado (MO para hourly, Facturado para fixed + Extras)
      totalExtraBudget, // Total de presupuestos extra
      totalExtraCost, // Costo total de extras por horas (MO + Mat)
      totalExtraLaborCost, // Costo MO de extras por horas
      totalExtraMaterialsCost, // Costo Mat de extras por horas
      totalExtraOfficialHours, // Horas Oficial de extras por horas
      totalExtraWorkerHours, // Horas Peón de extras por horas
      // Gran total combinando facturado normal y todos los tipos de extras
      grandTotal: grandTotalInvoiced + totalExtraBudget + totalExtraLaborCost // Ingreso = Facturado + Presupuesto Extra + MO Extra
    },
    byWeek,
    byProject
  };
}