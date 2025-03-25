// src/utils/calculations/laborUtils.js
import { calculateTimeDifference } from '../calculationUtils';

/**
 * Calcula los datos relacionados con la mano de obra
 *
 * @param {Object} labor - Datos de mano de obra (horas de entrada/salida)
 * @param {Object} project - Datos del proyecto (tarifas)
 * @returns {Object} Resultados de los cálculos de mano de obra
 */
export function calculateLabor(labor = {}, project = {}) {
  // Si no hay datos de labor o proyecto, devolver valores por defecto
  if (!labor || !project) {
    return {
      officialHours: 0,
      workerHours: 0,
      officialCost: 0,
      workerCost: 0,
      totalLaborCost: 0
    };
  }

  const { officialEntry, officialExit, workerEntry, workerExit } = labor;
  const { officialPrice = 0, workerPrice = 0 } = project;

  // Calcular horas trabajadas
  const officialHours = calculateTimeDifference(officialEntry, officialExit);
  const workerHours = calculateTimeDifference(workerEntry, workerExit);

  // Calcular costes
  const officialCost = officialHours * officialPrice;
  const workerCost = workerHours * workerPrice;
  const totalLaborCost = officialCost + workerCost;

  return {
    officialHours,
    workerHours,
    officialCost,
    workerCost,
    totalLaborCost
  };
}