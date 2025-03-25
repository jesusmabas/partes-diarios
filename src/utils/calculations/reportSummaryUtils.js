// src/utils/calculations/reportSummaryUtils.js

/**
 * Calcula resúmenes y estadísticas de reportes
 * 
 * @param {Array} reports - Lista de reportes
 * @param {Array} projects - Lista de proyectos
 * @param {string} selectedProjectId - ID del proyecto seleccionado (opcional)
 * @returns {Object} Resultados de los cálculos de resumen
 */
export function calculateReportSummary(reports = [], projects = [], selectedProjectId = "") {
  if (!reports || !Array.isArray(reports) || !projects || !Array.isArray(projects)) {
    return {
      totals: {
        totalLabor: 0,
        totalMaterials: 0,
        totalCost: 0,
        totalInvoiced: 0,
        totalHours: 0,
        totalIncome: 0,
        totalExtraBudget: 0,
        totalExtraCost: 0,
        grandTotal: 0 // Initialize grandTotal
      },
      byWeek: [],
      byProject: []
    };
  }

  // Filtrar reportes por proyecto si es necesario
  const filteredReports = selectedProjectId 
    ? reports.filter(report => report.projectId === selectedProjectId)
    : reports;

  // Calcular totales
  let totalLabor = 0;
  let totalMaterials = 0;
  let totalCost = 0;
  let totalInvoiced = 0;
  let totalHours = 0;
  let totalIncome = 0;
  let totalExtraBudget = 0;
  let totalExtraCost = 0;

  // Agrupaciones para análisis
  const reportsByWeek = {};
  const reportsByProject = {};

  filteredReports.forEach(report => {
    // Obtener tipo de proyecto
    const project = projects.find(p => p.id === report.projectId);
    const projectType = project ? project.type : 'hourly'; // Default a hourly si no se encuentra
    
    // Determinar si es un trabajo extra
    const isExtraWork = report.isExtraWork;
    
    if (isExtraWork) {
      // Proceso de trabajos extra
      if (report.extraWorkType === 'hourly') {
        // Trabajo extra por horas
        if (report.labor) {
          totalExtraCost += report.labor.totalLaborCost || 0;
        }
        
        totalExtraCost += report.totalMaterialsCost || 0;
      } else {
        // Trabajo extra con presupuesto adicional
        totalExtraBudget += report.extraBudgetAmount || 0;
      }
    } else {
      // Procesar trabajos regulares
      if (report.labor) {
        totalLabor += report.labor.totalLaborCost || 0;
        totalHours += (report.labor.officialHours || 0) + (report.labor.workerHours || 0);
        
        // Si es proyecto por horas, la mano de obra cuenta como ingreso
        if (projectType === 'hourly') {
          totalIncome += report.labor.totalLaborCost || 0;
        }
      }
      
      // Materiales
      totalMaterials += report.totalMaterialsCost || 0;
      
      // Coste total
      // Removed the condition, always sum labor and materials if present
        totalCost += (report.labor?.totalLaborCost || 0) + (report.totalMaterialsCost || 0);

      // Importe facturado (para proyectos de presupuesto cerrado)
      if (report.invoicedAmount) {
        totalInvoiced += report.invoicedAmount;
        // Si es proyecto de presupuesto cerrado, lo facturado cuenta como ingreso
        if (projectType === 'fixed') {
          totalIncome += report.invoicedAmount;
        }
      }
    }

    // Agrupar por semana
    const weekKey = `${report.weekNumber}-${new Date(report.reportDate).getFullYear()}`;
    if (!reportsByWeek[weekKey]) {
      reportsByWeek[weekKey] = {
        weekNumber: report.weekNumber,
        year: new Date(report.reportDate).getFullYear(),
        weekLabel: `Sem ${report.weekNumber}/${new Date(report.reportDate).getFullYear()}`,
        laborCost: 0,
        materialsCost: 0,
        totalCost: 0,
        invoicedAmount: 0,
        totalIncome: 0,
        extraBudget: 0,
        extraCost: 0,
        count: 0
      };
    }
    
    // Actualizar datos por semana
    reportsByWeek[weekKey].count += 1;
    
    if (isExtraWork) {
      if (report.extraWorkType === 'hourly') {
        if (report.labor) {
          reportsByWeek[weekKey].extraCost += report.labor.totalLaborCost || 0;
        }
        reportsByWeek[weekKey].extraCost += report.totalMaterialsCost || 0;
      } else {
        reportsByWeek[weekKey].extraBudget += report.extraBudgetAmount || 0;
      }
    } else {
      if (report.labor) {
        reportsByWeek[weekKey].laborCost += report.labor.totalLaborCost || 0;
      }
      reportsByWeek[weekKey].materialsCost += report.totalMaterialsCost || 0;
      
      // Removed totalCost calculation from here
      
      if (report.invoicedAmount) {
        reportsByWeek[weekKey].invoicedAmount += report.invoicedAmount;
      }
      
      // Actualizar ingresos según tipo de proyecto
      if (projectType === 'hourly' && report.labor) {
        reportsByWeek[weekKey].totalIncome += report.labor.totalLaborCost || 0;
      } else if (projectType === 'fixed' && report.invoicedAmount) {
        reportsByWeek[weekKey].totalIncome += report.invoicedAmount;
      }
    }

    // Agrupar por proyecto
    if (!reportsByProject[report.projectId]) {
      reportsByProject[report.projectId] = {
        projectId: report.projectId,
        client: project?.client || 'Desconocido',
        type: projectType,
        laborCost: 0,
        materialsCost: 0,
        totalCost: 0,
        invoicedAmount: 0,
        totalIncome: 0,
        extraBudget: 0,
        extraCost: 0,
        count: 0,
        reports: 0
      };
    }
    
    // Actualizar datos por proyecto
    reportsByProject[report.projectId].count += 1;
    reportsByProject[report.projectId].reports += 1;
    
    // Similar a la agrupación por semana, pero para proyectos
    if (isExtraWork) {
      if (report.extraWorkType === 'hourly') {
        if (report.labor) {
          reportsByProject[report.projectId].extraCost += report.labor.totalLaborCost || 0;
        }
        reportsByProject[report.projectId].extraCost += report.totalMaterialsCost || 0;
      } else {
        reportsByProject[report.projectId].extraBudget += report.extraBudgetAmount || 0;
      }
    } else {
      if (report.labor) {
        reportsByProject[report.projectId].laborCost += report.labor.totalLaborCost || 0;
      }
      reportsByProject[report.projectId].materialsCost += report.totalMaterialsCost || 0;
      
      // Removed totalCost calculation from here
      
      if (report.invoicedAmount) {
        reportsByProject[report.projectId].invoicedAmount += report.invoicedAmount;
      }
      
      if (projectType === 'hourly' && report.labor) {
        reportsByProject[report.projectId].totalIncome += report.labor.totalLaborCost || 0;
      } else if (projectType === 'fixed' && report.invoicedAmount) {
        reportsByProject[report.projectId].totalIncome += report.invoicedAmount;
      }
    }
  });

  // Convertir agrupaciones a arrays
  const byWeek = Object.values(reportsByWeek).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.weekNumber - b.weekNumber;
  });

  const byProject = Object.values(reportsByProject).sort((a, b) => {
    return b.totalIncome - a.totalIncome;
  });

  return {
    totals: {
      totalLabor,
      totalMaterials,
      totalCost,
      totalInvoiced,
      totalHours,
      totalIncome,
      totalExtraBudget,
      totalExtraCost,
      grandTotal: totalInvoiced + totalExtraBudget + totalExtraCost // Correct grandTotal calculation
    },
    byWeek,
    byProject
  };
}