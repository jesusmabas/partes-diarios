import { calculateLabor } from '../laborUtils';

describe('laborUtils - calculateLabor', () => {
  // Caso básico con todos los datos correctos
  test('calcula correctamente las horas y costes cuando todos los datos son válidos', () => {
    const labor = {
      officialEntry: '08:00',
      officialExit: '16:00',
      workerEntry: '08:00',
      workerExit: '16:00'
    };
    
    const project = {
      officialPrice: 25,
      workerPrice: 18
    };
    
    const result = calculateLabor(labor, project);
    
    // Comprobamos que las horas se calculan correctamente (8 horas)
    expect(result.officialHours).toBe(8);
    expect(result.workerHours).toBe(8);
    
    // Comprobamos que los costes se calculan correctamente
    expect(result.officialCost).toBe(200); // 8 horas * 25€
    expect(result.workerCost).toBe(144);   // 8 horas * 18€
    expect(result.totalLaborCost).toBe(344); // 200€ + 144€
  });
  
  // Caso donde se cruza la medianoche
  test('maneja correctamente casos donde la hora de salida es menor que la de entrada (cruce de medianoche)', () => {
    const labor = {
      officialEntry: '22:00',
      officialExit: '06:00',
      workerEntry: '22:00',
      workerExit: '06:00'
    };
    
    const project = {
      officialPrice: 30,
      workerPrice: 20
    };
    
    const result = calculateLabor(labor, project);
    
    // Comprobamos que las horas se calculan correctamente (8 horas)
    expect(result.officialHours).toBe(8);
    expect(result.workerHours).toBe(8);
    
    // Comprobamos que los costes se calculan correctamente
    expect(result.officialCost).toBe(240); // 8 horas * 30€
    expect(result.workerCost).toBe(160);   // 8 horas * 20€
    expect(result.totalLaborCost).toBe(400); // 240€ + 160€
  });
  
  // Caso de datos incompletos (solo oficial, no hay peón)
  test('calcula correctamente cuando solo hay datos del oficial', () => {
    const labor = {
      officialEntry: '09:00',
      officialExit: '15:00',
      workerEntry: '', // Sin datos de peón
      workerExit: ''
    };
    
    const project = {
      officialPrice: 22,
      workerPrice: 16
    };
    
    const result = calculateLabor(labor, project);
    
    // Comprobamos que las horas del oficial se calculan bien y las del peón son 0
    expect(result.officialHours).toBe(6);
    expect(result.workerHours).toBe(0);
    
    // Comprobamos que los costes se calculan correctamente
    expect(result.officialCost).toBe(132); // 6 horas * 22€
    expect(result.workerCost).toBe(0);    // No hay horas de peón
    expect(result.totalLaborCost).toBe(132); // 132€ + 0€
  });
  
  // Caso sin datos (valores por defecto)
  test('devuelve valores por defecto cuando no hay datos', () => {
    const result = calculateLabor();
    
    expect(result.officialHours).toBe(0);
    expect(result.workerHours).toBe(0);
    expect(result.officialCost).toBe(0);
    expect(result.workerCost).toBe(0);
    expect(result.totalLaborCost).toBe(0);
  });
  
  // Caso de horas parciales
  test('calcula correctamente horas parciales', () => {
    const labor = {
      officialEntry: '08:00',
      officialExit: '13:30', // 5.5 horas
      workerEntry: '08:30',
      workerExit: '13:00'    // 4.5 horas
    };
    
    const project = {
      officialPrice: 25,
      workerPrice: 18
    };
    
    const result = calculateLabor(labor, project);
    
    // Comprobamos que las horas se calculan correctamente
    expect(result.officialHours).toBe(5.5);
    expect(result.workerHours).toBe(4.5);
    
    // Comprobamos que los costes se calculan correctamente
    expect(result.officialCost).toBe(137.5); // 5.5 horas * 25€
    expect(result.workerCost).toBe(81);      // 4.5 horas * 18€
    expect(result.totalLaborCost).toBe(218.5); // 137.5€ + 81€
  });
  
  // Caso de datos inválidos
  test('maneja datos inválidos de manera segura', () => {
    const labor = {
      officialEntry: 'invalid',
      officialExit: 'invalid',
      workerEntry: 'invalid',
      workerExit: 'invalid'
    };
    
    const project = {
      officialPrice: 25,
      workerPrice: 18
    };
    
    const result = calculateLabor(labor, project);
    
    // En caso de datos inválidos, debería devolverse 0 para evitar fallos
    expect(result.officialHours).toBe(0);
    expect(result.workerHours).toBe(0);
    expect(result.totalLaborCost).toBe(0);
  });
});