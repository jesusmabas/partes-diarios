// src/utils/calculations/reportSummaryUtils.js

export function calculateReportSummary(reports = [], projects = [], selectedProjectId = "") {
  if (!Array.isArray(reports)) reports = [];
  if (!Array.isArray(projects)) projects = [];

  const filteredReports = selectedProjectId
    ? reports.filter(report => report.projectId === selectedProjectId)
    : reports;

  let totalLabor = 0;
  let totalMaterials = 0;
  let totalCost = 0;
  let totalHours = 0;
  let totalIncome = 0;
  let totalExtraBudget = 0;
  let totalExtraCost = 0;

  const reportsByWeek = {};
  const reportsByProject = {};
  const processedProjectIds = new Set();

  filteredReports.forEach(report => {
    const project = projects.find(p => p.id === report.projectId);
    const projectType = project?.type || 'hourly';
    const isExtraWork = report.isExtraWork ?? false;

    if (isExtraWork && projectType === 'fixed') {
      if (report.extraWorkType === 'hourly') {
        const extraLabor = parseFloat(report.labor?.totalLaborCost) || 0;
        const extraMats = parseFloat(report.totalMaterialsCost) || 0;
        const extraRepCost = parseFloat(report.totalCost) || (extraLabor + extraMats);
        totalExtraCost += extraRepCost;
        totalIncome += extraLabor;
      } else if (report.extraWorkType === 'additional_budget') {
        const extraBudget = parseFloat(report.extraBudgetAmount) || 0;
        totalExtraBudget += extraBudget;
        totalIncome += extraBudget;
      }
    } else if (!isExtraWork) {
      const laborCost = parseFloat(report.labor?.totalLaborCost) || 0;
      const materialsCost = parseFloat(report.totalMaterialsCost) || 0;
      const reportCost = parseFloat(report.totalCost) || (laborCost + materialsCost);

      totalLabor += laborCost;
      totalMaterials += materialsCost;
      totalCost += reportCost;
      totalHours += (parseFloat(report.labor?.officialHours) || 0) + (parseFloat(report.labor?.workerHours) || 0);

      if (projectType === 'hourly') {
        totalIncome += laborCost;
      }
    }

    const reportDateObj = report.reportDate ? new Date(report.reportDate) : null;
    if (reportDateObj && report.weekNumber) {
      const year = reportDateObj.getFullYear();
      const weekKey = `${report.weekNumber}-${year}`;
      if (!reportsByWeek[weekKey]) {
        reportsByWeek[weekKey] = {
          weekNumber: report.weekNumber, year: year, weekLabel: `Sem ${report.weekNumber}/${year}`,
          laborCost: 0, materialsCost: 0, totalCost: 0, invoicedAmount: 0, totalIncome: 0,
          extraBudget: 0, extraCost: 0, count: 0
        };
      }
      reportsByWeek[weekKey].count += 1;
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
          reportsByWeek[weekKey].invoicedAmount += invoicedW;
          reportsByWeek[weekKey].totalIncome += invoicedW;
        }
      }
    }

    const projectId = report.projectId;
    processedProjectIds.add(projectId);
    if (!reportsByProject[projectId]) {
      reportsByProject[projectId] = {
        projectId: projectId, client: project?.client || 'Desconocido', type: projectType, projectData: project,
        laborCost: 0, materialsCost: 0, totalCost: 0, invoicedAmount: 0, totalIncome: 0,
        extraBudget: 0, extraCost: 0, count: 0, reports: 0
      };
    }
    reportsByProject[projectId].count += 1;
    reportsByProject[projectId].reports += 1;
    if (isExtraWork && projectType === 'fixed') {
      if (report.extraWorkType === 'hourly') {
        const extraRepCostP = parseFloat(report.totalCost) || (parseFloat(report.labor?.totalLaborCost) || 0) + (parseFloat(report.totalMaterialsCost) || 0);
        reportsByProject[projectId].extraCost += extraRepCostP;
      } else if (report.extraWorkType === 'additional_budget') {
        reportsByProject[projectId].extraBudget += parseFloat(report.extraBudgetAmount) || 0;
      }
    } else if (!isExtraWork) {
      reportsByProject[projectId].laborCost += parseFloat(report.labor?.totalLaborCost) || 0;
      reportsByProject[projectId].materialsCost += parseFloat(report.totalMaterialsCost) || 0;
      const reportCostP = parseFloat(report.totalCost) || (parseFloat(report.labor?.totalLaborCost) || 0) + (parseFloat(report.totalMaterialsCost) || 0);
      reportsByProject[projectId].totalCost += reportCostP;
    }
  });

  let grandTotalInvoiced = 0;
  Object.keys(reportsByProject).forEach(pid => {
    const projSummary = reportsByProject[pid];
    const projData = projSummary.projectData;
    if (projSummary.type === 'fixed') {
      const projectTotalInvoiced = parseFloat(projData?.totalInvoicedAmount) || 0;
      projSummary.invoicedAmount = projectTotalInvoiced;
      projSummary.totalIncome = projectTotalInvoiced;
      grandTotalInvoiced += projectTotalInvoiced;
    } else if (projSummary.type === 'hourly') {
      projSummary.totalIncome = projSummary.laborCost;
      projSummary.invoicedAmount = 0;
    }
     projSummary.totalIncome += projSummary.extraBudget + (projSummary.type === 'fixed' ? projSummary.extraCost : 0);
    delete projSummary.projectData;
  });

   totalIncome = Object.values(reportsByProject).reduce((sum, proj) => sum + proj.totalIncome, 0);

  const byWeek = Object.values(reportsByWeek).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.weekNumber - b.weekNumber;
  });

  const byProject = Object.values(reportsByProject).sort((a, b) => {
    return (b.totalIncome + b.extraBudget + b.extraCost) - (a.totalIncome + a.extraBudget + a.extraCost);
  });

  return {
    totals: {
      totalLabor, totalMaterials, totalCost, totalInvoiced: grandTotalInvoiced, totalHours, totalIncome,
      totalExtraBudget, totalExtraCost,
      grandTotal: grandTotalInvoiced + totalExtraBudget + totalExtraCost
    },
    byWeek,
    byProject
  };
}