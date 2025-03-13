// src/components/common/PDFButton.js
import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportPDFGenerator from "../ReportPDFGenerator";

const PDFButton = ({ 
  reports, 
  projects, 
  selectedProjectId, 
  dateRange,
  disabled 
}) => {
  if (disabled) {
    return (
      <p className="pdf-disabled-message">
        Para generar un PDF, selecciona un proyecto y asegúrate de que haya reportes disponibles.
      </p>
    );
  }

  return (
    <div className="pdf-button-container">
      <PDFDownloadLink
        document={
          <ReportPDFGenerator 
            reports={reports.map(r => ({...r}))} 
            projects={projects.map(p => ({...p}))} 
          />
        }
        fileName={`informe_${selectedProjectId || 'todos'}_${dateRange.startDate || 'inicio'}_${dateRange.endDate || 'fin'}.pdf`}
      >
        {({ blob, url, loading, error }) => {
          if (error) {
            console.error("Error en PDFDownloadLink:", error);
            return (
              <button className="pdf-button error-button">
                Error al generar PDF
              </button>
            );
          }
          return (
            <button className="pdf-button">
              {loading ? "Preparando PDF..." : "Descargar Informe en PDF"}
            </button>
          );
        }}
      </PDFDownloadLink>
    </div>
  );
};

export default React.memo(PDFButton);