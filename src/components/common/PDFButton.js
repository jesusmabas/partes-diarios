import React, { useState, useCallback } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportPDFGenerator from "../ReportPDFGenerator";

const PDFButton = ({
  reports,
  projects,
  selectedProjectId,
  onLoadAllReports, // Nueva prop: función para cargar todos los reportes
  hasMoreReports = false, // Nueva prop: indica si hay más reportes sin cargar
  isLoadingAll = false // Nueva prop: indica si se están cargando todos
}) => {
  const [preparingPDF, setPreparingPDF] = useState(false);
  const [allReportsLoaded, setAllReportsLoaded] = useState(!hasMoreReports);

  const handlePDFClick = useCallback(async (e) => {
    // Si hay reportes sin cargar, cargarlos primero
    if (hasMoreReports && !allReportsLoaded && onLoadAllReports) {
      e.preventDefault(); // Prevenir descarga inmediata
      
      const userConfirm = window.confirm(
        `Solo se han cargado ${reports.length} reportes. ¿Deseas cargar todos los reportes antes de generar el PDF?\n\n` +
        `Esto puede tardar unos segundos dependiendo de la cantidad de datos.`
      );

      if (userConfirm) {
        setPreparingPDF(true);
        try {
          await onLoadAllReports();
          setAllReportsLoaded(true);
          alert('Todos los reportes cargados. Ahora puedes generar el PDF.');
        } catch (error) {
          console.error('Error cargando todos los reportes:', error);
          alert('Error al cargar todos los reportes. El PDF solo incluirá los reportes visibles.');
        } finally {
          setPreparingPDF(false);
        }
      } else {
        // Usuario eligió continuar con reportes parciales
        setAllReportsLoaded(true);
      }
    }
  }, [hasMoreReports, allReportsLoaded, onLoadAllReports, reports.length]);

  // Si no hay reportes
  if (reports.length === 0) {
    return (
      <div className="pdf-button-container">
        <p className="pdf-disabled-message">
          No hay reportes para generar el PDF
        </p>
      </div>
    );
  }

  // Si se están cargando todos los reportes
  if (preparingPDF || isLoadingAll) {
    return (
      <div className="pdf-button-container">
        <button className="pdf-button" disabled>
          Cargando todos los reportes...
        </button>
      </div>
    );
  }

  // Advertencia si hay reportes sin cargar
  const showWarning = hasMoreReports && !allReportsLoaded;

  return (
    <div className="pdf-button-container">
      {showWarning && (
        <div className="pdf-warning">
          ⚠️ Hay más reportes sin cargar. El PDF solo incluirá los {reports.length} reportes actualmente visibles.
          <br />
          <small>Haz clic en el botón para cargar todos antes de generar.</small>
        </div>
      )}
      
      <PDFDownloadLink
        document={
          <ReportPDFGenerator
            reports={reports.map(r => ({...r}))}
            projects={projects.map(p => ({...p}))}
          />
        }
        fileName={`informe_${selectedProjectId || 'todos'}_${new Date().toISOString().split('T')[0]}.pdf`}
        className={`pdf-button ${showWarning ? 'warning' : ''}`}
        onClick={handlePDFClick}
      >
        {({ loading, error }) => {
          if (error) {
            console.error("Error en PDFDownloadLink:", error);
            return <span className="error-button">Error al generar PDF</span>;
          }
          
          if (loading) {
            return "Generando PDF...";
          }

          return showWarning 
            ? "⚠️ Generar PDF (reportes parciales)" 
            : "📄 Descargar PDF";
        }}
      </PDFDownloadLink>
    </div>
  );
};

export default React.memo(PDFButton);