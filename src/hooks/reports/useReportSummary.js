// src/hooks/reports/useReportSummary.js
import { useMemo } from "react";
// Importamos la ÚNICA función de cálculo que debe existir
import { calculateReportSummary } from "../../utils/calculations/reportSummaryUtils";

/**
 * Hook personalizado que actúa como un simple 'wrapper' memoizado
 * para la función de cálculo de resumen principal.
 * 
 * @param {Array} reports - La lista completa de reportes a analizar.
 * @param {Array} projects - La lista de proyectos.
 * @param {string} selectedProjectId - El ID del proyecto para filtrar (o "" para todos).
 * @returns {Object} - El objeto completo de resultados de calculateReportSummary, principalmente `{ totals, byWeek, byProject }`.
 */
export const useReportSummary = (reports = [], projects = [], selectedProjectId = "") => {
  // useMemo asegura que el cálculo complejo solo se ejecuta si los datos de entrada cambian.
  const summary = useMemo(() => {
    // Llama a la función de cálculo maestra y robusta.
    // Esta es la única fuente de verdad para los cálculos del resumen.
    return calculateReportSummary(reports, projects, selectedProjectId);
  }, [reports, projects, selectedProjectId]);

  return summary;
};

export default useReportSummary;