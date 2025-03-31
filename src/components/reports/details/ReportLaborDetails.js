// src/components/reports/details/ReportLaborDetails.js
import React from "react";
import { formatNumber, formatCurrency } from "../../../utils/calculationUtils";

const ReportLaborDetails = ({ laborCalcs }) => {
  if (!laborCalcs) return null;

  return (
    <div className="labor-details">
      <h5>Mano de obra</h5>
      <p>Oficial: {formatNumber(laborCalcs.officialHours)} h - {formatCurrency(laborCalcs.officialCost)}</p>
      <p>Peón: {formatNumber(laborCalcs.workerHours)} h - {formatCurrency(laborCalcs.workerCost)}</p>
      <p>Total mano de obra: {formatCurrency(laborCalcs.totalLaborCost)}</p>
    </div>
  );
};

export default React.memo(ReportLaborDetails);