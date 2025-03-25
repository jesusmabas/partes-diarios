import { calculateReportSummary } from '../reportSummaryUtils';

describe('reportSummaryUtils - calculateReportSummary', () => {
  // Datos de prueba comunes
  const sampleProjects = [
    { id: 'project1', type: 'hourly', client: 'Cliente 1' },
    { id: 'project2', type: 'fixed', client: 'Cliente 2' }
  ];
  
  const sampleReports = [
    // Proyecto por horas
    {
      id: 'report1',
      projectId: 'project1',
      reportDate: '2023-01-15',
      weekNumber: 2,
      labor: { 
        totalLaborCost: 400,
        officialHours: 5,
        workerHours: 5
      },
      totalMaterialsCost: 150,
      totalCost: 550
    },
    {
      id: 'report2',
      projectId: 'project1',
      reportDate: '2023-01-16',
      weekNumber: 3,
      labor: { 
        totalLaborCost: 320,
        officialHours: 4,
        workerHours: 4
      },
      totalMaterialsCost: 200,
      totalCost: 520
    },
    // Proyecto de presupuesto cerrado
    {
      id: 'report3',
      projectId: 'project2',
      reportDate: '2023-01-15',
      weekNumber: 2,
      invoicedAmount: 1000
    },
    {
      id: 'report4',
      projectId: 'project2',
      reportDate: '2023-01-22',
      weekNumber: 3,
      invoicedAmount: 1500
    },
    // Trabajo extra (presupuesto adicional)
    {
      id: 'report5',
      projectId: 'project2',
      reportDate: '2023-01-23',
      weekNumber: 4,
      isExtraWork: true,
      extraWorkType: 'additional_budget',
      extraBudgetAmount: 800
    },
    // Trabajo extra (por horas)
    {
      id: 'report6',
      projectId: 'project2',
      reportDate: '2023-01-24',
      weekNumber: 4,
      isExtraWork: true,
      extraWorkType: 'hourly',
      labor: {
        totalLaborCost: 250,
        officialHours: 3,
        workerHours: 3
      },
      totalMaterialsCost: 100,
      totalCost: 350
    }
  ];
  
  // Caso básico con todos los reportes
  test('calcula correctamente totales generales para todos los reportes', () => {
    const result = calculateReportSummary(sampleReports, sampleProjects);
    
    // Verificar totales
    expect(result.totals.totalLabor).toBe(720); // 400 + 320
    expect(result.totals.totalMaterials).toBe(350); // 150 + 200
    expect(result.totals.totalCost).toBe(1070); // 550 + 520
    expect(result.totals.totalInvoiced).toBe(2500); // 1000 + 1500
    expect(result.totals.totalHours).toBe(18); // 5+5 + 4+4
    expect(result.totals.totalIncome).toBe(3220); // 720 + 2500 (labor en hourly + invoiced en fixed)
    expect(result.totals.totalExtraBudget).toBe(800);
    expect(result.totals.totalExtraCost).toBe(350); // 250 + 100
  });
  
  // Filtrado por proyecto
  test('filtra correctamente por proyecto seleccionado', () => {
    const result = calculateReportSummary(sampleReports, sampleProjects, 'project1');
    
    // Solo debe incluir datos del proyecto1
    expect(result.totals.totalLabor).toBe(720); // 400 + 320
    expect(result.totals.totalMaterials).toBe(350); // 150 + 200
    expect(result.totals.totalInvoiced).toBe(0); // No hay invoiced en proyecto1
    expect(result.totals.totalExtraBudget).toBe(0); // No hay trabajos extra en proyecto1
    
    // Verificar agrupación por proyecto
    expect(result.byProject).toHaveLength(1);
    expect(result.byProject[0].projectId).toBe('project1');
  });
  
  // Agrupación por semana
  test('agrupa correctamente por semana', () => {
    const result = calculateReportSummary(sampleReports, sampleProjects);
    
    // Debe haber 3 semanas diferentes
    expect(result.byWeek).toHaveLength(3);
    
    // Verificar algunas semanas específicas
    const week2 = result.byWeek.find(w => w.weekNumber === 2);
    expect(week2).toBeDefined();
    expect(week2.laborCost).toBe(400);
    expect(week2.materialsCost).toBe(150);
    expect(week2.invoicedAmount).toBe(1000);
    
    const week4 = result.byWeek.find(w => w.weekNumber === 4);
    expect(week4).toBeDefined();
    expect(week4.extraBudget).toBe(800);
    expect(week4.extraCost).toBe(350);
  });
  
  // Agrupación por proyecto
  test('agrupa correctamente por proyecto', () => {
    const result = calculateReportSummary(sampleReports, sampleProjects);
    
    // Debe haber 2 proyectos
    expect(result.byProject).toHaveLength(2);
    
    // Verificar proyecto1 (hourly)
    const project1Data = result.byProject.find(p => p.projectId === 'project1');
    expect(project1Data).toBeDefined();
    expect(project1Data.type).toBe('hourly');
    expect(project1Data.laborCost).toBe(720);
    expect(project1Data.materialsCost).toBe(350);
    expect(project1Data.totalIncome).toBe(720); // En hourly, el ingreso es la mano de obra
    
    // Verificar proyecto2 (fixed)
    const project2Data = result.byProject.find(p => p.projectId === 'project2');
    expect(project2Data).toBeDefined();
    expect(project2Data.type).toBe('fixed');
    expect(project2Data.invoicedAmount).toBe(2500);
    expect(project2Data.extraBudget).toBe(800);
    expect(project2Data.extraCost).toBe(350);
    expect(project2Data.totalIncome).toBe(2500); // En fixed, el ingreso es lo facturado
  });
  
  // Caso sin datos
  test('devuelve valores por defecto cuando no hay datos', () => {
    // Sin reportes ni proyectos
    let result = calculateReportSummary();
    
    expect(result.totals.totalLabor).toBe(0);
    expect(result.totals.totalInvoiced).toBe(0);
    expect(result.byWeek).toEqual([]);
    expect(result.byProject).toEqual([]);
    
    // Con proyectos pero sin reportes
    result = calculateReportSummary([], sampleProjects);
    
    expect(result.totals.totalLabor).toBe(0);
    expect(result.byWeek).toEqual([]);
    
    // Con reportes pero sin proyectos
    result = calculateReportSummary(sampleReports, []);
    
    // Debería calcular los totales pero no podrá clasificar bien por tipo de proyecto
    expect(result.totals.totalLabor).toBe(720);
    expect(result.totals.totalInvoiced).toBe(2500);
  });
  
  // Reportes con datos incompletos
  test('maneja correctamente reportes con datos incompletos', () => {
    const incompleteReports = [
      // Reporte por horas sin labor
      {
        id: 'report1',
        projectId: 'project1',
        reportDate: '2023-01-15',
        weekNumber: 2,
        // Sin labor
        totalMaterialsCost: 150
      },
      // Reporte por horas sin totalMaterialsCost
      {
        id: 'report2',
        projectId: 'project1',
        reportDate: '2023-01-16',
        weekNumber: 3,
        labor: { 
          totalLaborCost: 320,
          officialHours: 4,
          workerHours: 4
        }
        // Sin totalMaterialsCost
      },
      // Reporte fixed sin invoicedAmount
      {
        id: 'report3',
        projectId: 'project2',
        reportDate: '2023-01-15',
        weekNumber: 2
        // Sin invoicedAmount
      }
    ];
    
    const result = calculateReportSummary(incompleteReports, sampleProjects);
    
    // Debería manejar los valores faltantes como cero
    expect(result.totals.totalLabor).toBe(320); // Solo del report2
    expect(result.totals.totalMaterials).toBe(150); // Solo del report1
    expect(result.totals.totalInvoiced).toBe(0); // El report3 no tiene invoicedAmount
  });
  
  // Ordenación de reportes por semana/año
  test('ordena correctamente los reportes por semana y año', () => {
    const multiYearReports = [
      // Año 2022
      {
        id: 'report1',
        projectId: 'project1',
        reportDate: '2022-12-25',
        weekNumber: 52,
        labor: { totalLaborCost: 100 },
        totalMaterialsCost: 50
      },
      // Año 2023
      {
        id: 'report2',
        projectId: 'project1',
        reportDate: '2023-01-01',
        weekNumber: 1,
        labor: { totalLaborCost: 200 },
        totalMaterialsCost: 100
      },
      // Mismo año, semana anterior
      {
        id: 'report3',
        projectId: 'project1',
        reportDate: '2023-02-15',
        weekNumber: 7,
        labor: { totalLaborCost: 300 },
        totalMaterialsCost: 150
      }
    ];
    
    const result = calculateReportSummary(multiYearReports, sampleProjects);
    
    // Las semanas deben estar ordenadas por año y número de semana
    expect(result.byWeek).toHaveLength(3);
    expect(result.byWeek[0].year).toBe(2022);
    expect(result.byWeek[0].weekNumber).toBe(52);
    expect(result.byWeek[1].year).toBe(2023);
    expect(result.byWeek[1].weekNumber).toBe(1);
    expect(result.byWeek[2].year).toBe(2023);
    expect(result.byWeek[2].weekNumber).toBe(7);
  });
  
  // Ordenación de proyectos por ingreso total
  test('ordena correctamente los proyectos por ingreso total', () => {
    const result = calculateReportSummary(sampleReports, sampleProjects);
    
    // Los proyectos deben estar ordenados por totalIncome (de mayor a menor)
    expect(result.byProject).toHaveLength(2);
    expect(result.byProject[0].totalIncome).toBeGreaterThanOrEqual(result.byProject[1].totalIncome);
  });
});