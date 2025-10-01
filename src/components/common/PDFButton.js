import React, { useState, useCallback, useMemo } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportPDFGenerator from "../ReportPDFGenerator";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const PDFButton = ({
  reports,
  projects,
  selectedProjectId,
  startDate = "",
  endDate = "",
  onLoadAllReports,
  hasMoreReports = false,
  isLoadingAll = false
}) => {
  const [preparingPDF, setPreparingPDF] = useState(false);
  const [allReportsLoaded, setAllReportsLoaded] = useState(!hasMoreReports);
  const [cumulativeData, setCumulativeData] = useState(null);
  const [isLoadingCumulative, setIsLoadingCumulative] = useState(false);

  // Generar nombre de archivo con fechas
  const generateFileName = () => {
    const projectName = selectedProjectId || 'todos';
    const today = new Date().toISOString().split('T')[0];
    
    if (startDate && endDate) {
      return `informe_${projectName}_${startDate}_a_${endDate}.pdf`;
    } else if (startDate) {
      return `informe_${projectName}_desde_${startDate}.pdf`;
    } else if (endDate) {
      return `informe_${projectName}_hasta_${endDate}.pdf`;
    } else {
      return `informe_${projectName}_${today}.pdf`;
    }
  };

  // Calcular datos acumulativos (todo el historial del proyecto)
  const calculateCumulativeData = useCallback(async () => {
    if (!selectedProjectId) return null;

    setIsLoadingCumulative(true);
    try {
      // Obtener TODOS los reportes del proyecto (sin filtro de fecha)
      const reportsQuery = query(
        collection(db, 'dailyReports'),
        where('projectId', '==', selectedProjectId),
        where('isExtraWork', '==', false)
      );
      
      const snapshot = await getDocs(reportsQuery);
      let totalInvoiced = 0;
      let totalHours = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        totalInvoiced += parseFloat(data.invoicedAmount) || 0;
        if (data.labor) {
          totalHours += (parseFloat(data.labor.officialHours) || 0) + 
                       (parseFloat(data.labor.workerHours) || 0);
        }
      });

      // Obtener trabajos extra acumulados
      const extraQuery = query(
        collection(db, 'dailyReports'),
        where('projectId', '==', selectedProjectId),
        where('isExtraWork', '==', true)
      );
      
      const extraSnapshot = await getDocs(extraQuery);
      let totalExtraIncome = 0;

      extraSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.extraWorkType === 'additional_budget') {
          totalExtraIncome += parseFloat(data.extraBudgetAmount) || 0;
        } else if (data.extraWorkType === 'hourly' && data.labor) {
          totalExtraIncome += parseFloat(data.labor.totalLaborCost) || 0;
        }
      });

      return {
        totalInvoiced,
        totalHours,
        totalExtraIncome,
        totalCount: snapshot.size + extraSnapshot.size
      };
    } catch (error) {
      console.error('Error calculando datos acumulativos:', error);
      return null;
    } finally {
      setIsLoadingCumulative(false);
    }
  }, [selectedProjectId]);

  const handlePDFClick = useCallback(async (e) => {
    // Primero cargar datos acumulativos si hay proyecto seleccionado
    if (selectedProjectId && !cumulativeData) {
      e.preventDefault();
      const cumulative = await calculateCumulativeData();
      setCumulativeData(cumulative);
      return; // El usuario tendrá que hacer click de nuevo
    }

    // Luego manejar carga de reportes si es necesario
    if (hasMoreReports && !allReportsLoaded && onLoadAllReports) {
      e.preventDefault();
      
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
        setAllReportsLoaded(true);
      }
    }
  }, [hasMoreReports, allReportsLoaded, onLoadAllReports, reports.length, selectedProjectId, cumulativeData, calculateCumulativeData]);

  if (reports.length === 0) {
    return (
      <div className="pdf-button-container">
        <p className="pdf-disabled-message">
          No hay reportes para generar el PDF
        </p>
      </div>
    );
  }

  if (preparingPDF || isLoadingAll || isLoadingCumulative) {
    return (
      <div className="pdf-button-container">
        <button className="pdf-button" disabled>
          {isLoadingCumulative ? 'Calculando totales acumulados...' : 'Cargando todos los reportes...'}
        </button>
      </div>
    );
  }

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
            cumulativeData={cumulativeData}
            periodInfo={{
              startDate,
              endDate,
              reportCount: reports.length
            }}
          />
        }
        fileName={generateFileName()}
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