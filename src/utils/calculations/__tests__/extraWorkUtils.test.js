import { calculateExtraWork } from '../extraWorkUtils';

describe('extraWorkUtils - calculateExtraWork', () => {
  // Caso básico con distintos tipos de trabajo extra
  test('calcula correctamente totales para diferentes tipos de trabajos extra', () => {
    const project = {
      id: 'project1',
      type: 'fixed'
    };
    
    const reports = [
      // Trabajos extra con presupuesto adicional
      { 
        id: '1', 
        projectId: 'project1', 
        isExtraWork: true, 
        extraWorkType: 'additional_budget',
        extraBudgetAmount: 1500 
      },
      { 
        id: '2', 
        projectId: 'project1', 
        isExtraWork: true, 
        extraWorkType: 'additional_budget',
        extraBudgetAmount: 2000 
      },
      // Trabajos extra por horas
      {
        id: '3',
        projectId: 'project1',
        isExtraWork: true,
        extraWorkType: 'hourly',
        labor: { totalLaborCost: 800 },
        totalMaterialsCost: 400
      },
      // Reporte normal (no extra work)
      {
        id: '4',
        projectId: 'project1',
        isExtraWork: false,
        invoicedAmount: 3000
      }
    ];
    
    const result = calculateExtraWork(reports, project);
    
    // Verificar cálculos
    expect(result.totalExtraBudget).toBe(3500); // 1500 + 2000
    expect(result.totalExtraLaborCost).toBe(800);  // labor cost del trabajo por horas
    expect(result.totalExtraMaterials).toBe(400); // materials cost del trabajo por horas
    expect(result.totalExtraCost).toBe(1200); // 800 + 400
    expect(result.totalExtra).toBe(4700); // 3500 + 1200
    expect(result.extraWorkCount).toBe(3); // Total de reportes de trabajos extra
    expect(result.extraWorkReports).toHaveLength(3);
  });
  
  // Caso sin trabajos extra
  test('devuelve valores por defecto cuando no hay trabajos extra', () => {
    const project = {
      id: 'project1',
      type: 'fixed'
    };
    
    const reports = [
      // Solo reportes normales
      {
        id: '1',
        projectId: 'project1',
        isExtraWork: false,
        invoicedAmount: 2000
      },
      {
        id: '2',
        projectId: 'project1',
        isExtraWork: false,
        invoicedAmount: 3000
      }
    ];
    
    const result = calculateExtraWork(reports, project);
    
    // Verificar que todos los valores son cero
    expect(result.totalExtraBudget).toBe(0);
    expect(result.totalExtraLaborCost).toBe(0);
    expect(result.totalExtraMaterials).toBe(0);
    expect(result.totalExtraCost).toBe(0);
    expect(result.totalExtra).toBe(0);
    expect(result.extraWorkCount).toBe(0);
    expect(result.extraWorkReports).toEqual([]);
  });
  
  // Caso con múltiples proyectos (debe filtrar solo el seleccionado)
  test('solo incluye trabajos extra del proyecto especificado', () => {
    const project = {
      id: 'project1',
      type: 'fixed'
    };
    
    const reports = [
      // Trabajo extra del proyecto1
      { 
        id: '1', 
        projectId: 'project1', 
        isExtraWork: true, 
        extraWorkType: 'additional_budget',
        extraBudgetAmount: 1500 
      },
      // Trabajo extra del proyecto2 (no debería contarse)
      { 
        id: '2', 
        projectId: 'project2', 
        isExtraWork: true, 
        extraWorkType: 'additional_budget',
        extraBudgetAmount: 3000 
      }
    ];
    
    const result = calculateExtraWork(reports, project);
    
    // Solo debe contar el trabajo extra del proyecto1
    expect(result.totalExtraBudget).toBe(1500);
    expect(result.extraWorkCount).toBe(1);
  });
  
  // Caso sin datos
  test('devuelve valores por defecto cuando no hay datos', () => {
    // Sin reportes ni proyecto
    let result = calculateExtraWork();
    
    expect(result.totalExtraBudget).toBe(0);
    expect(result.totalExtraLaborCost).toBe(0);
    expect(result.totalExtraMaterials).toBe(0);
    expect(result.totalExtraCost).toBe(0);
    expect(result.totalExtra).toBe(0);
    expect(result.extraWorkCount).toBe(0);
    expect(result.extraWorkReports).toEqual([]);
    
    // Con proyecto pero sin reportes
    result = calculateExtraWork([], { id: 'project1' });
    
    expect(result.totalExtraBudget).toBe(0);
    expect(result.extraWorkCount).toBe(0);
    
    // Con reportes pero sin proyecto
    result = calculateExtraWork([
      { 
        id: '1', 
        projectId: 'project1', 
        isExtraWork: true, 
        extraWorkType: 'additional_budget',
        extraBudgetAmount: 1500 
      }
    ]);
    
    // Debería devolver valores por defecto si no se proporciona proyecto
    expect(result.totalExtraBudget).toBe(0);
    expect(result.extraWorkCount).toBe(0);
  });
  
  // Caso con datos incompletos en reportes de trabajo extra
  test('maneja correctamente reportes con datos incompletos', () => {
    const project = {
      id: 'project1',
      type: 'fixed'
    };
    
    const reports = [
      // Trabajo extra sin extraBudgetAmount
      { 
        id: '1', 
        projectId: 'project1', 
        isExtraWork: true, 
        extraWorkType: 'additional_budget'
        // Falta extraBudgetAmount
      },
      // Trabajo extra por horas sin datos de mano de obra
      {
        id: '2',
        projectId: 'project1',
        isExtraWork: true,
        extraWorkType: 'hourly'
        // Faltan labor y totalMaterialsCost
      }
    ];
    
    const result = calculateExtraWork(reports, project);
    
    // Debería manejar los valores faltantes como cero
    expect(result.totalExtraBudget).toBe(0);
    expect(result.totalExtraLaborCost).toBe(0);
    expect(result.totalExtraMaterials).toBe(0);
    expect(result.extraWorkCount).toBe(2); // Aún cuenta los reportes aunque falten datos
  });
});