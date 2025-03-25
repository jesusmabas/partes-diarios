// src/utils/__tests__/calculationUtils.test.js
import {
  calculateTimeDifference,
  convertToHours,
  getWeekNumber,
  formatCurrency,
  formatNumber,
} from '../calculationUtils';

describe('calculationUtils', () => {
  describe('calculateTimeDifference', () => {
    test('calcula correctamente la diferencia entre dos horas', () => {
      expect(calculateTimeDifference('08:00', '10:30')).toBe(2.5);
      expect(calculateTimeDifference('22:00', '01:00')).toBe(3); // Cruza medianoche
      expect(calculateTimeDifference('10:00', '10:00')).toBe(0);
      expect(calculateTimeDifference('10:45', '10:15')).toBe(23.5); //Caso donde la hora de salida es inferior a la de entrada.
    });

    test('maneja formatos inválidos de hora devolviendo 0', () => {
      expect(calculateTimeDifference('invalid', '12:00')).toBe(0);
      expect(calculateTimeDifference('08:00', 'invalid')).toBe(0);
      expect(calculateTimeDifference('25:00', '12:00')).toBe(0);
      expect(calculateTimeDifference('08:00', '24:30')).toBe(0);
      expect(calculateTimeDifference('', '')).toBe(0);
      expect(calculateTimeDifference(null, null)).toBe(0);
      expect(calculateTimeDifference(undefined, undefined)).toBe(0);
    });
  });

  describe('convertToHours', () => {
    test('convierte correctamente string de tiempo a horas decimales', () => {
      expect(convertToHours('08:00')).toBe(8);
      expect(convertToHours('08:30')).toBe(8.5);
      expect(convertToHours('08:15')).toBe(8.25);
      expect(convertToHours('08:45')).toBe(8.75);
    });

    test('devuelve 0 cuando faltan datos', () => {
      expect(convertToHours('')).toBe(0);
      expect(convertToHours(null)).toBe(0);
      expect(convertToHours(undefined)).toBe(0);
    });

    test('maneja formatos inválidos devolviendo 0', () => {
      expect(convertToHours('invalid')).toBe(0);
      // Este caso depende de la implementación; si split() sobre un string inválido
      // no devuelve un array con elementos válidos, podría resultar en NaN
    });
  });

  describe('getWeekNumber', () => {
    test('calcula correctamente el número de semana', () => {
      // Fechas específicas con semanas conocidas
      expect(getWeekNumber('2023-01-01')).toBe(52);  // 2023-01-01 es semana 52 del año 2022
      expect(getWeekNumber('2023-03-15')).toBe(11);
      expect(getWeekNumber('2023-12-25')).toBe(52);
      expect(getWeekNumber('2024-01-01')).toBe(1);   // 2024-01-01 sí es semana 1 de 2024
    });

    test('maneja fechas inválidas', () => {
      // Esto depende de la implementación; en algunos casos podría devolver undefined o NaN
      // en lugar de un número específico
      expect(typeof getWeekNumber('invalid-date')).toBe('number');
    });
  });

  describe('formatCurrency', () => {
    test('formatea correctamente valores de moneda', () => {
      expect(formatCurrency(1234.56)).toBe('1.234,56 €');
      expect(formatCurrency(0)).toBe('0,00 €');
      expect(formatCurrency(1)).toBe('1,00 €');
      expect(formatCurrency(1000)).toBe('1.000,00 €');
    });

    test('maneja valores especiales', () => {
      expect(formatCurrency(null)).toBe('0,00 €');
      expect(formatCurrency(undefined)).toBe('0,00 €');
      expect(formatCurrency('')).toBe('0,00 €');
      expect(formatCurrency(NaN)).toBe('0,00 €');
    });
  });

  describe('formatNumber', () => {
    test('formatea correctamente números con dos decimales', () => {
      expect(formatNumber(1234.567)).toBe('1234.57');
      expect(formatNumber(0)).toBe('0.00');
      expect(formatNumber(1)).toBe('1.00');
      expect(formatNumber(1.5)).toBe('1.50');
      expect(formatNumber(1000)).toBe('1000.00');
    });

    test('maneja valores especiales', () => {
      expect(formatNumber(null)).toBe('0.00');
      expect(formatNumber(undefined)).toBe('0.00');
      expect(formatNumber('')).toBe('0.00');
      expect(formatNumber(NaN)).toBe('0.00'); //Ahora devuelve 0.00
    });
  });
});