import { calculateBudget } from '../budgetUtils';

describe('budgetUtils - calculateBudget', () => {
  // Proyecto con reportes
  test('calcula correctamente el presupuesto, facturado y restante', () => {
    const project = {
      id: 'project1',
      budgetAmount: 10000
    };
    
    const reports = [
      { id: '1', projectId: 'project1', invoicedAmount: 2000, isExtraWork: false },
      { id: '2', projectId: 'project1', invoicedAmount: 3000, isExtraWork: false },
      { id: '3', projectId: 'project1', invoicedAmount: 1500, isExtraWork: false }
    ];
    
    const result = calculateBudget(project, reports);
    
    expect(result.budgetAmount).toBe(10000);
    expect(result.invoicedTotal).toBe(6500); // 2000 + 3000 + 1500
    expect(result.remainingBudget).toBe(3500); // 10000 - 6500
    expect(result.progressPercentage).toBe(65); // (6500 / 10000) * 100
    expect(result.isOverBudget).toBe(false);
  });
  
  // Caso de presupuesto excedido
  test('identifica correctamente cuando se excede el presupuesto', () => {
    const project = {
      id: 'project1',
      budgetAmount: 5000
    };
    
    const reports = [
      { id: '1', projectId: 'project1', invoicedAmount: 2000, isExtraWork: false },
      { id: '2', projectId: 'project1', invoicedAmount: 3500, isExtraWork: false }
    ];
    
    const result = calculateBudget(project, reports);
    
    expect(result.budgetAmount).toBe(5000);
    expect(result.invoicedTotal).toBe(5500); // 2000 + 3500
    expect(result.remainingBudget).toBe(-500); // 5000 - 5500
    // El porcentaje no debería superar el 100% aunque se haya excedido el presupuesto
    expect(result.progressPercentage).toBe(100);
    expect(result.isOverBudget).toBe(true);
  });
  
  // Caso con trabajos extra que no deben contabilizarse
  test('no incluye trabajos extra en el cálculo del presupuesto', () => {
    const project = {
      id: 'project1',
      budgetAmount: 5000
    };
    
    const reports = [
      { id: '1', projectId: 'project1', invoicedAmount: 2000, isExtraWork: false },
      { id: '2', projectId: 'project1', invoicedAmount: 1500, isExtraWork: false },
      { id: '3', projectId: 'project1', invoicedAmount: 3000, isExtraWork: true } // Trabajo extra
    ];
    
    const result = calculateBudget(project, reports);
    
    // El trabajo extra no debe incluirse en el total facturado contra el presupuesto
    expect(result.invoicedTotal).toBe(3500); // 2000 + 1500 (excluye 3000)
    expect(result.remainingBudget).toBe(1500); // 5000 - 3500
    expect(result.progressPercentage).toBe(70); // (3500 / 5000) * 100
    expect(result.isOverBudget).toBe(false);
  });
  
  // Caso de filtrado de reportes por projectId
  test('solo incluye reportes del proyecto actual', () => {
    const project = {
      id: 'project1',
      budgetAmount: 8000
    };
    
    const reports = [
      { id: '1', projectId: 'project1', invoicedAmount: 2000, isExtraWork: false },
      { id: '2', projectId: 'project2', invoicedAmount: 5000, isExtraWork: false }, // Otro proyecto
      { id: '3', projectId: 'project1', invoicedAmount: 1000, isExtraWork: false }
    ];
    
    const result = calculateBudget(project, reports);
    
    // Solo debe contar los reportes del proyecto1
    expect(result.invoicedTotal).toBe(3000); // 2000 + 1000 (excluye 5000)
  });
  
  // Caso sin datos
  test('devuelve valores por defecto cuando no hay proyecto o reportes', () => {
    // Sin proyecto ni reportes
    let result = calculateBudget();
    
    expect(result.budgetAmount).toBe(0);
    expect(result.invoicedTotal).toBe(0);
    expect(result.remainingBudget).toBe(0);
    expect(result.progressPercentage).toBe(0);
    expect(result.isOverBudget).toBe(false);
    
    // Con proyecto pero sin reportes
    result = calculateBudget({ id: 'project1', budgetAmount: 5000 });
    
    expect(result.budgetAmount).toBe(5000);
    expect(result.invoicedTotal).toBe(0);
    expect(result.remainingBudget).toBe(5000);
    expect(result.progressPercentage).toBe(0);
    
    // Con reportes pero sin proyecto
    result = calculateBudget(null, [
      { id: '1', projectId: 'project1', invoicedAmount: 2000, isExtraWork: false }
    ]);
    
    expect(result.budgetAmount).toBe(0);
    expect(result.invoicedTotal).toBe(0);
  });
  
  // Caso con presupuesto cero
  test('maneja correctamente proyectos con presupuesto cero', () => {
    const project = {
      id: 'project1',
      budgetAmount: 0
    };
    
    const reports = [
      { id: '1', projectId: 'project1', invoicedAmount: 2000, isExtraWork: false }
    ];
    
    const result = calculateBudget(project, reports);
    
    expect(result.budgetAmount).toBe(0);
    expect(result.invoicedTotal).toBe(2000);
    expect(result.remainingBudget).toBe(-2000);
    // Evitar división por cero
    expect(result.progressPercentage).toBe(0);
    expect(result.isOverBudget).toBe(true);
  });
});