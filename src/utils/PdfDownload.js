// src/utils/PdfDownload.js - Versión simplificada
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

const PDFDownloadButton = ({ 
  Document, 
  documentProps = {}, 
  fileName = 'document.pdf',
  buttonProps = {},
  children
}) => {
  const generatePdf = async () => {
    try {
      // Crear el PDF sin complicaciones adicionales
      const blob = await pdf(<Document {...documentProps} />).toBlob();
      saveAs(blob, fileName);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
    }
  };

  return (
    <div className="pdf-download-container">
      <button
        onClick={generatePdf}
        {...buttonProps}
      >
        {children || 'Descargar PDF'}
      </button>
    </div>
  );
};

export const generateAndDownloadPDF = async (Document, documentProps = {}, fileName = 'document.pdf') => {
  try {
    const blob = await pdf(<Document {...documentProps} />).toBlob();
    saveAs(blob, fileName);
    return { success: true };
  } catch (err) {
    console.error('Error al generar PDF:', err);
    return { success: false, error: err.message };
  }
};

export default PDFDownloadButton;