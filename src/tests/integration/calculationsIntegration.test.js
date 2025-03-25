import { renderHook } from '@testing-library/react';
import { useCalculationsService } from '../../hooks/useCalculationsService';

// Nota: Aquí usamos las implementaciones reales, no los mocks
jest.unmock('../../utils/calculations/laborUtils');
jest.unmock('../../utils/calculations/materialsUtils');
jest.unmock('../../utils/calculations/budgetUtils');
jest.unmock('../../utils/calculations/extraWorkUtils');
jest.unmock('../../utils/calculations/reportSummaryUtils');

describe('Tests de Integración - Cálculos', () => {
  /**
   * Escenario 1: Proyecto por horas con varios reportes
   * - Calcular costes de cada reporte individual
   * - Calcular resumen general de todos los reportes
   */
  test('Escenario 1: Proyecto por horas con varios reportes', () => {
    const { result } = renderHook(() => useCalculationsService());

    // Datos del proyecto
    const project = {
      id: 'proyecto-hora',
      type: 'hourly',
      officialPrice: 25,
      workerPrice: 15,
      client: 'Cliente de prueba'
    };

    // Reportes de trabajo
    const reports = [
      {
        id: 'report1',
        projectId: 'proyecto-hora',
        reportDate: '2023-10-15',
        weekNumber: 41,
        labor: {
          officialEntry: '08:00',
          officialExit: '14:00',  // 6 horas
          workerEntry: '08:00',
          workerExit: '14:00'     // 6 horas
        },
        materials: [
          { id: 'mat1', description: 'Material 1', cost: 50 },
          { id: 'mat2', description: 'Material 2', cost: 75 }
        ]
      },
      {
        id: 'report2',
        projectId: 'proyecto-hora',
        reportDate: '2023-10-16',
        weekNumber: 42,
        labor: {
          officialEntry: '09:00',
          officialExit: '17:00',  // 8 horas
          workerEntry: '09:00',
          workerExit: '17:00'     // 8 horas
        },
        materials: [
          { id: 'mat3', description: 'Material 3', cost: 120 }
        ]
      }
    ];

    // Calcular información para cada reporte
    const report1Labor = result.current.calculateLabor(reports[0].labor, project);
    const report1Materials = result.current.calculateMaterials(reports[0].materials);
    const report1Cost = result.current.calculateReportTotalCost(reports[0], project);
    const report1Income = result.current.calculateReportTotalIncome(reports[0], project);

    const report2Labor = result.current.calculateLabor(reports[1].labor, project);
    const report2Materials = result.current.calculateMaterials(reports[1].materials);
    const report2Cost = result.current.calculateReportTotalCost(reports[1], project);
    const report2Income = result.current.calculateReportTotalIncome(reports[1], project);

    // Calculamos valores esperados
    const expectedReport1OfficialCost = 6 * 25; // 150
    const expectedReport1WorkerCost = 6 * 15;  // 90
    const expectedReport1LaborCost = 150 + 90; // 240
    const expectedReport1MaterialsCost = 50 + 75; // 125
    const expectedReport1TotalCost = 240 + 125; // 365

    const expectedReport2OfficialCost = 8 * 25; // 200
    const expectedReport2WorkerCost = 8 * 15;  // 120
    const expectedReport2LaborCost = 200 + 120; // 320
    const expectedReport2MaterialsCost = 120;
    const expectedReport2TotalCost = 320 + 120; // 440

    // Verificar cálculos de reportes individuales
    expect(report1Labor.officialHours).toBe(6);
    expect(report1Labor.workerHours).toBe(6);
    expect(report1Labor.officialCost).toBe(expectedReport1OfficialCost);
    expect(report1Labor.workerCost).toBe(expectedReport1WorkerCost);
    expect(report1Labor.totalLaborCost).toBe(expectedReport1LaborCost);

    expect(report1Materials.totalMaterialsCost).toBe(expectedReport1MaterialsCost);
    expect(report1Cost).toBe(expectedReport1TotalCost);
    expect(report1Income).toBe(expectedReport1LaborCost); // En hourly, el ingreso es la mano de obra

    expect(report2Labor.officialHours).toBe(8);
    expect(report2Labor.workerHours).toBe(8);
    expect(report2Labor.totalLaborCost).toBe(expectedReport2LaborCost);

    expect(report2Materials.totalMaterialsCost).toBe(expectedReport2MaterialsCost);
    expect(report2Cost).toBe(expectedReport2TotalCost);
    expect(report2Income).toBe(expectedReport2LaborCost);

    // Ahora calculamos y verificamos el resumen global
    // Actualizamos los reportes con los valores calculados para que reportSummary pueda usarlos
    const enrichedReports = [
      {
        ...reports[0],
        labor: { ...reports[0].labor, ...report1Labor },
        totalMaterialsCost: report1Materials.totalMaterialsCost,
        totalCost: report1Cost
      },
      {
        ...reports[1],
        labor: { ...reports[1].labor, ...report2Labor },
        totalMaterialsCost: report2Materials.totalMaterialsCost,
        totalCost: report2Cost
      }
    ];

    const summary = result.current.calculateReportSummary(enrichedReports, [project]);

    // Verificar totales del resumen
    const expectedTotalLabor = expectedReport1LaborCost + expectedReport2LaborCost; // 240 + 320 = 560
    const expectedTotalMaterials = expectedReport1MaterialsCost + expectedReport2MaterialsCost; // 125 + 120 = 245
    const expectedTotalCost = expectedReport1TotalCost + expectedReport2TotalCost; // 365 + 440 = 805
    const expectedTotalHours = (6 + 6) + (8 + 8); // 28

    expect(summary.totals.totalLabor).toBe(expectedTotalLabor);
    expect(summary.totals.totalMaterials).toBe(expectedTotalMaterials);
    expect(summary.totals.totalCost).toBe(expectedTotalCost);
    expect(summary.totals.totalHours).toBe(expectedTotalHours);
    expect(summary.totals.totalIncome).toBe(expectedTotalLabor); // En hourly, el ingreso es la mano de obra

    // Verificar agrupación por semana
    expect(summary.byWeek).toHaveLength(2); // Dos semanas diferentes

    const week41 = summary.byWeek.find(w => w.weekNumber === 41);
    const week42 = summary.byWeek.find(w => w.weekNumber === 42);

    expect(week41.laborCost).toBe(expectedReport1LaborCost);
    expect(week41.materialsCost).toBe(expectedReport1MaterialsCost);

    expect(week42.laborCost).toBe(expectedReport2LaborCost);
    expect(week42.materialsCost).toBe(expectedReport2MaterialsCost);

    // Verificar agrupación por proyecto
    expect(summary.byProject).toHaveLength(1); // Solo un proyecto
    expect(summary.byProject[0].projectId).toBe('proyecto-hora');
    expect(summary.byProject[0].laborCost).toBe(expectedTotalLabor);
    expect(summary.byProject[0].materialsCost).toBe(expectedTotalMaterials);
  });

  /**
   * Escenario 2: Proyecto de presupuesto cerrado con trabajos extra
   * - Calcular importes facturados normales
   * - Calcular importes de trabajos extra (presupuesto adicional y por horas)
   * - Calcular resumen general
   */
  // src/tests/integration/calculationsIntegration.test.js
// ... (rest of the file) ...

  test('Escenario 2: Proyecto de presupuesto cerrado con trabajos extra', () => {
    const { result } = renderHook(() => useCalculationsService());

    // Datos del proyecto
    const project = {
      id: 'proyecto-cerrado',
      type: 'fixed',
      budgetAmount: 10000,
      allowExtraWork: true,
      officialPrice: 30, // Para trabajos extra por horas
      workerPrice: 20,   // Para trabajos extra por horas
      client: 'Cliente de presupuesto cerrado'
    };

    // Reportes de trabajo
    const reports = [
      // Reporte normal dentro del presupuesto
      {
        id: 'report1',
        projectId: 'proyecto-cerrado',
        reportDate: '2023-10-15',
        weekNumber: 41,
        isExtraWork: false,
        invoicedAmount: 3000,
        workPerformed: { description: 'Trabajo normal' }
      },
      // Otro reporte normal
      {
        id: 'report2',
        projectId: 'proyecto-cerrado',
        reportDate: '2023-10-22',
        weekNumber: 42,
        isExtraWork: false,
        invoicedAmount: 4000,
        workPerformed: { description: 'Trabajo normal 2' }
      },
      // Trabajo extra con presupuesto adicional
      {
        id: 'report3',
        projectId: 'proyecto-cerrado',
        reportDate: '2023-10-25',
        weekNumber: 43,
        isExtraWork: true,
        extraWorkType: 'additional_budget',
        extraBudgetAmount: 1500,
        workPerformed: { description: 'Trabajo extra presupuestado' }
      },
      // Trabajo extra por horas
      {
        id: 'report4',
        projectId: 'proyecto-cerrado',
        reportDate: '2023-10-28',
        weekNumber: 43,
        isExtraWork: true,
        extraWorkType: 'hourly',
        labor: {
          officialEntry: '09:00',
          officialExit: '15:00',  // 6 horas
          workerEntry: '09:00',
          workerExit: '15:00'     // 6 horas
        },
        materials: [
          { id: 'matExtra', description: 'Material para trabajo extra', cost: 200 }
        ],
        workPerformed: { description: 'Trabajo extra por horas' }
      }
    ];

    // Calculamos datos del presupuesto
    const budgetSummary = result.current.calculateBudget(project, reports);

    // Cálculos para trabajo extra por horas (report4)
    const extraWorkLabor = result.current.calculateLabor(reports[3].labor, project);
    const extraWorkMaterials = result.current.calculateMaterials(reports[3].materials);


    // *** FIX: Enriquecer report4 con los cálculos ANTES de llamar a calculateExtraWork ***
    const enrichedReport4 = {
      ...reports[3],
      labor: { ...reports[3].labor, ...extraWorkLabor }, // Add calculated labor data
      totalMaterialsCost: extraWorkMaterials.totalMaterialsCost, // Add calculated materials cost
    };

    // Create a new array with the enriched report
    const enrichedReports = [...reports];
    enrichedReports[3] = enrichedReport4;


    // Cálculos de trabajos extra
    // *** FIX: Usar enrichedReports en lugar de reports ***
    const extraWorkSummary = result.current.calculateExtraWork(enrichedReports, project);


    // Calcular resumen general
    const summary = result.current.calculateReportSummary(enrichedReports, [project]);

    // Verificar cálculos del presupuesto
    expect(budgetSummary.budgetAmount).toBe(10000);
    expect(budgetSummary.invoicedTotal).toBe(7000); // 3000 + 4000
    expect(budgetSummary.remainingBudget).toBe(3000); // 10000 - 7000
    expect(budgetSummary.progressPercentage).toBe(70); // (7000 / 10000) * 100
    expect(budgetSummary.isOverBudget).toBe(false);

    // Verificar cálculos del trabajo extra por horas
    const expectedExtraLaborCost = (6 * 30) + (6 * 20); // 6h oficial * 30€ + 6h peón * 20€ = 180 + 120 = 300
    expect(extraWorkLabor.totalLaborCost).toBe(expectedExtraLaborCost);
    expect(extraWorkMaterials.totalMaterialsCost).toBe(200);

    // Verificar resumen de trabajos extra
    expect(extraWorkSummary.totalExtraBudget).toBe(1500); // Del report3
    expect(extraWorkSummary.totalExtraLaborCost).toBe(expectedExtraLaborCost); // labor cost del trabajo por horas
    expect(extraWorkSummary.totalExtraMaterials).toBe(200); // materials cost del trabajo por horas
    expect(extraWorkSummary.totalExtraCost).toBe(expectedExtraLaborCost + 200); // 300 + 200 = 500
    expect(extraWorkSummary.totalExtra).toBe(1500 + 500); // 2000
    expect(extraWorkSummary.extraWorkCount).toBe(2); // Dos reportes de trabajo extra

    // Verificar resumen general
    const summary_totals = summary.totals;
    expect(summary_totals.totalInvoiced).toBe(7000); // 3000 + 4000
    expect(summary_totals.totalExtraBudget).toBe(1500);
    expect(summary_totals.totalExtraCost).toBe(500); // 300 + 200

    // Ingresos totales: facturado normal + trabajos extra
    expect(summary_totals.totalIncome).toBe(7000); // En fixed, el ingreso es lo facturado
    expect(summary_totals.grandTotal).toBe(7000 + 1500 + 500); // 9000
  });

// ... (rest of the file) ...
});