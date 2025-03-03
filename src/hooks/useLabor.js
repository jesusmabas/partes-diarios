import { useMemo } from "react";

export const useLabor = (labor, project) => {
  return useMemo(() => {
    const { officialEntry, officialExit, workerEntry, workerExit } = labor;
    const officialStart = officialEntry ? new Date(`2025-01-01T${officialEntry}`) : null;
    const officialEnd = officialExit ? new Date(`2025-01-01T${officialExit}`) : null;
    const workerStart = workerEntry ? new Date(`2025-01-01T${workerEntry}`) : null;
    const workerEnd = workerExit ? new Date(`2025-01-01T${workerExit}`) : null;

    if (officialStart && officialEnd && officialEnd < officialStart) {
      officialEnd.setDate(officialEnd.getDate() + 1);
    }
    if (workerStart && workerEnd && workerEnd < workerStart) {
      workerEnd.setDate(workerEnd.getDate() + 1);
    }

    const officialHours = officialStart && officialEnd ? (officialEnd - officialStart) / 3600000 : 0;
    const workerHours = workerStart && workerEnd ? (workerEnd - workerStart) / 3600000 : 0;
    const officialCost = officialHours * (project?.officialPrice || 0);
    const workerCost = workerHours * (project?.workerPrice || 0);

    return {
      officialHours,
      workerHours,
      officialCost,
      workerCost,
      totalLaborCost: officialCost + workerCost,
    };
  }, [labor, project]);
};