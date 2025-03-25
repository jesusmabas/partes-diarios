// src/hooks/__tests__/useCalculationsService.test.js
import { renderHook } from '@testing-library/react';
import { useCalculationsService } from '../useCalculationsService';

// Mock de los módulos de utilidades
jest.mock('../../utils/calculations/laborUtils', () => ({
  calculateLabor: jest.fn((labor, project) => ({
    officialHours: 5,
    workerHours: 5,
    officialCost: 100,
    workerCost: 80,
    totalLaborCost: 180
  }))
}));

jest.mock('../../utils/calculations/materialsUtils', () => ({
  calculateMaterials: jest.fn((materials) => ({
    totalMaterialsCost: 150,
    materialItems: materials
  }))
}));

jest.mock('../../utils/calculations/budgetUtils', () => ({
  calculateBudget: jest.fn((project, reports) => ({
    budgetAmount: 5000,
    invoicedTotal: 2000,
    remainingBudget: 3000,
    progressPercentage: 40,
    isOverBudget: false
  }))
}));

jest.mock('../../utils/calculations/extraWorkUtils', () => ({
  calculateExtraWork: jest.fn((reports, project) => ({
    totalExtraBudget: 800,
    totalExtraHours: 250,
    totalExtraMaterials: 100,
    totalExtraCost: 350,
    totalExtra: 1150,
    extraWorkCount: 2,
    extraWorkReports: []
  }))
}));

jest.mock('../../utils/calculations/reportSummaryUtils', () => ({
  calculateReportSummary: jest.fn((reports, projects, selectedProjectId) => ({
    totals: {
      totalLabor: 720,
      totalMaterials: 350,
      totalCost: 1070,
      totalInvoiced: 2500,
      totalHours: 18,
      totalIncome: 3220
    },
    byWeek: [],
    byProject: []
  }))
}));

describe('useCalculationsService', () => {
  // Obtener referencias a los mocks para usarlos en los tests
  const laborUtils = require('../../utils/calculations/laborUtils');
  const materialsUtils = require('../../utils/calculations/materialsUtils');

  // Limpiar mocks después de cada test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Verificar que el hook devuelve todas las funciones esperadas
  test('devuelve todas las funciones de cálculo esperadas', () => {
    const { result } = renderHook(() => useCalculationsService());
    expect(result.current).toBeInstanceOf(Object);
    expect(result.current).toHaveProperty('calculateLabor');
    expect(result.current).toHaveProperty('calculateMaterials');
    expect(result.current).toHaveProperty('calculateBudget');
    expect(result.current).toHaveProperty('calculateExtraWork');
    expect(result.current).toHaveProperty('calculateReportSummary');
    expect(result.current).toHaveProperty('calculateReportTotalCost');
    expect(result.current).toHaveProperty('calculateReportTotalIncome');
  });

  // Verificar que las funciones importadas son llamadas correctamente
  test('llama a la función calculateLabor con los parámetros correctos', () => {
    const { result } = renderHook(() => useCalculationsService());

    const labor = { officialEntry: '08:00', officialExit: '16:00' };
    const project = { officialPrice: 20, workerPrice: 16 };

    // Obtener una referencia a la función mockeada antes de la llamada
    const { calculateLabor } = require('../../utils/calculations/laborUtils');

    // Verificar que la función no ha sido llamada aún
    expect(calculateLabor).not.toHaveBeenCalled();

    // Llamar a la función
    result.current.calculateLabor(labor, project);
    // Verificar que la función fue llamada exactamente una vez
    expect(calculateLabor).toHaveBeenCalledTimes(1);
    // Verificar que fue llamada con los parámetros correctos
    expect(calculateLabor).toHaveBeenCalledWith(labor, project);
    // Verificar que no fue llamada con otros parámetros
    expect(calculateLabor).not.toHaveBeenCalledWith({}, {});
  });

  test('llama a la función calculateMaterials con los parámetros correctos', () => {
    const { result } = renderHook(() => useCalculationsService());

    const materials = [{ id: 1, description: 'Material 1', cost: 100 }];

    // Obtener una referencia a la función mockeada
    const { calculateMaterials } = require('../../utils/calculations/materialsUtils');
    expect(calculateMaterials).not.toHaveBeenCalled();

    // Llamar a la función
    result.current.calculateMaterials(materials);

    // Verificaciones
    expect(calculateMaterials).toHaveBeenCalledTimes(1);
    expect(calculateMaterials).toHaveBeenCalledWith(materials);
    expect(calculateMaterials).not.toHaveBeenCalledWith([]);
  });

  test('llama a la función calculateBudget con los parámetros correctos', () => {
    const { result } = renderHook(() => useCalculationsService());

    const project = { id: 'project1', budgetAmount: 5000 };
    const reports = [{ id: 'report1', projectId: 'project1', invoicedAmount: 2000 }];

    // Obtener una referencia a la función mockeada
    const { calculateBudget } = require('../../utils/calculations/budgetUtils');
    expect(calculateBudget).not.toHaveBeenCalled();

    // Llamar a la función
    result.current.calculateBudget(project, reports);

    // Verificaciones
    expect(calculateBudget).toHaveBeenCalledTimes(1);
    expect(calculateBudget).toHaveBeenCalledWith(project, reports);

    // Verificar orden de argumentos
    const lastCall = calculateBudget.mock.calls[0];
    expect(lastCall[0]).toEqual(project);
    expect(lastCall[1]).toEqual(reports);
  });

  test('llama a la función calculateExtraWork con los parámetros correctos', () => {
    const { result } = renderHook(() => useCalculationsService());

    const reports = [{ id: 'report1', projectId: 'project1', isExtraWork: true }];
    const project = { id: 'project1' };

    // Obtener una referencia a la función mockeada
    const { calculateExtraWork } = require('../../utils/calculations/extraWorkUtils');
    expect(calculateExtraWork).not.toHaveBeenCalled();

    // Llamar a la función
    result.current.calculateExtraWork(reports, project);

    // Verificaciones
    expect(calculateExtraWork).toHaveBeenCalledTimes(1);
    expect(calculateExtraWork).toHaveBeenCalledWith(reports, project);

    // Inspeccionar la última llamada para verificar argumentos
    const lastCall = calculateExtraWork.mock.lastCall;
    expect(lastCall[0]).toEqual(reports);
    expect(lastCall[1]).toEqual(project);
  });

  test('llama a la función calculateReportSummary con los parámetros correctos', () => {
    const { result } = renderHook(() => useCalculationsService());

    const reports = [{ id: 'report1' }];
    const projects = [{ id: 'project1' }];
    const selectedProjectId = 'project1';

    // Obtener una referencia a la función mockeada
    const { calculateReportSummary } = require('../../utils/calculations/reportSummaryUtils');
    expect(calculateReportSummary).not.toHaveBeenCalled();

    // Llamar a la función
    result.current.calculateReportSummary(reports, projects, selectedProjectId);

    // Verificaciones
    expect(calculateReportSummary).toHaveBeenCalledTimes(1);
    expect(calculateReportSummary).toHaveBeenCalledWith(reports, projects, selectedProjectId);

    // Verificar todos los argumentos de la última llamada
    expect(calculateReportSummary.mock.calls[0]).toEqual([reports, projects, selectedProjectId]);
  });

  // Tests para las funciones propias del hook

  // calculateReportTotalCost para distintos tipos de reportes
  describe('calculateReportTotalCost', () => {
    it('calcula el coste para proyecto por horas', () => {
      const report = {
        labor: { officialEntry: '09:00', officialExit: '17:00', workerEntry: '08:00', workerExit: '16:00' },
        materials: [{ cost: 10 }, { cost: 20 }],
        isExtraWork: false,
        extraWorkType: 'hourly',
        extraBudgetAmount: 0
      };
      const project = { type: 'hourly', officialPrice: 20, workerPrice: 15 };

      // Usar mockReturnValue para los resultados de calculateLabor y calculateMaterials
      laborUtils.calculateLabor.mockReturnValue({ totalLaborCost: 260 });
      materialsUtils.calculateMaterials.mockReturnValue({ totalMaterialsCost: 30 });

      const { result } = renderHook(() => useCalculationsService());
      const cost = result.current.calculateReportTotalCost(report, project);

      expect(cost).toBe(290); // Suma de totalLaborCost y totalMaterialsCost
      expect(laborUtils.calculateLabor).toHaveBeenCalledWith(report.labor, project);
      expect(materialsUtils.calculateMaterials).toHaveBeenCalledWith(report.materials);
    });

    it('calcula el coste para trabajo extra por horas', () => {
      const report = {
        labor: { officialEntry: '09:00', officialExit: '17:00', workerEntry: '08:00', workerExit: '16:00' },
        materials: [], // Incluir materials
        isExtraWork: true,
        extraWorkType: 'hourly',
        extraBudgetAmount: 0 // Incluir extraBudgetAmount
      };
      const project = { type: 'fixed' }; // El tipo de proyecto es irrelevante para el coste total en este caso

      // Usar mockReturnValue para los resultados de calculateLabor y calculateMaterials
      laborUtils.calculateLabor.mockReturnValue({ totalLaborCost: 260 });
      materialsUtils.calculateMaterials.mockReturnValue({ totalMaterialsCost: 0 });

      const { result } = renderHook(() => useCalculationsService());
      const cost = result.current.calculateReportTotalCost(report, project);

      expect(cost).toBe(260); // Solo coste de labor
      expect(laborUtils.calculateLabor).toHaveBeenCalledWith(report.labor, project);
      expect(materialsUtils.calculateMaterials).toHaveBeenCalledWith(report.materials);
    });

    it('calcula el coste para trabajo extra con presupuesto adicional', () => {
      const report = {
        labor: { officialEntry: '09:00', officialExit: '17:00', workerEntry: '08:00', workerExit: '16:00' },
        materials: [{ cost: 10 }, { cost: 20 }],
        isExtraWork: true,
        extraWorkType: 'additional_budget',
        extraBudgetAmount: 1000
      };
      const project = { type: 'fixed' };  // Tipo de proyecto no importa en este caso
      const { result } = renderHook(() => useCalculationsService());
      const cost = result.current.calculateReportTotalCost(report, project);
      expect(cost).toBe(1000);  // Solo el importe adicional
    });


    it('calculateReportTotalCost calcula el coste para proyecto de presupuesto cerrado', () => {
      const report = {
        labor: { officialEntry: '09:00', officialExit: '17:00', workerEntry: '08:00', workerExit: '16:00' },
        materials: [{ cost: 10 }, { cost: 20 }],
        isExtraWork: false,
        extraWorkType: 'hourly',
        extraBudgetAmount: 0,
        invoicedAmount: 500
       };
      const project = { type: 'fixed' }; // Importante: type es 'fixed'
      const { result } = renderHook(() => useCalculationsService());
      const cost = result.current.calculateReportTotalCost(report, project);
      expect(cost).toBe(500);  // Solo el importe facturado
    });
  });

  // Tests para calculateReportTotalIncome
  describe('calculateReportTotalIncome', () => {
    it('calcula los ingresos para proyecto por horas', () => {
      const report = {
        labor: { officialEntry: '09:00', officialExit: '17:00', workerEntry: '08:00', workerExit: '16:00' }, // Incluir labor
        materials: [{ cost: 10 }, { cost: 20 }],
        isExtraWork: false,
        extraWorkType: 'hourly', // Incluir extraWorkType
        extraBudgetAmount: 0 // Incluir extraBudgetAmount
      };
      const project = { type: 'hourly', officialPrice: 20, workerPrice: 15 };
      laborUtils.calculateLabor.mockReturnValue({ totalLaborCost: 260 });

      const { result } = renderHook(() => useCalculationsService());
      const income = result.current.calculateReportTotalIncome(report, project);
      expect(income).toBe(260); // Ingresos = coste de la mano de obra
      expect(laborUtils.calculateLabor).toHaveBeenCalledWith(report.labor, project);
    });

    it('calcula los ingresos para trabajo extra por horas', () => {
      const report = {
        labor: { officialEntry: '09:00', officialExit: '17:00', workerEntry: '08:00', workerExit: '16:00' }, // Incluir labor
        materials: [{ cost: 10 }, { cost: 20 }],
        isExtraWork: true,
        extraWorkType: 'hourly',
        extraBudgetAmount: 0 // Incluir extraBudgetAmount
      };
      const project = { type: 'fixed', officialPrice: 20, workerPrice: 15 };
      laborUtils.calculateLabor.mockReturnValue({ totalLaborCost: 260 });
      const { result } = renderHook(() => useCalculationsService());
      const income = result.current.calculateReportTotalIncome(report, project);
      expect(income).toBe(260);  // Ingresos = coste de la mano de obra
      expect(laborUtils.calculateLabor).toHaveBeenCalledWith(report.labor, project);
    });

    it('calcula los ingresos para trabajo extra con presupuesto adicional', () => {
      const report = {
        labor: { officialEntry: '09:00', officialExit: '17:00', workerEntry: '08:00', workerExit: '16:00' },
        materials: [{ cost: 10 }, { cost: 20 }],
        isExtraWork: true,
        extraWorkType: 'additional_budget',
        extraBudgetAmount: 1000
      };
      const project = { type: 'fixed' }; // El tipo de proyecto no importa
      const { result } = renderHook(() => useCalculationsService());
      const income = result.current.calculateReportTotalIncome(report, project);
      expect(income).toBe(1000); // Ingresos = importe adicional
    });

    it('calcula los ingresos para proyecto de presupuesto cerrado', () => {
      const report = {
        labor: { officialEntry: '09:00', officialExit: '17:00', workerEntry: '08:00', workerExit: '16:00' },
        materials: [{ cost: 10 }, { cost: 20 }],
        isExtraWork: false,
        extraWorkType: 'hourly',
        extraBudgetAmount: 0,
        invoicedAmount: 500
       };
      const project = { type: 'fixed' }; // Importante: type es 'fixed'
      const { result } = renderHook(() => useCalculationsService());
      const income = result.current.calculateReportTotalIncome(report, project);
      expect(income).toBe(500); // Ingresos = importe facturado
    });
  });
});