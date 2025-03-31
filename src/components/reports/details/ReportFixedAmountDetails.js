// src/components/reports/details/ReportFixedAmountDetails.js
import React from "react";
import { formatCurrency } from "../../../utils/calculationUtils";

const ReportFixedAmountDetails = ({ label, amount }) => {
  return (
    <div className="fixed-budget-details">
      <p><strong>{label}:</strong> {formatCurrency(amount)}</p>
    </div>
  );
};

export default React.memo(ReportFixedAmountDetails);