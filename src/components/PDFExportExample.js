// src/components/PDFExportExample.js
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import PDFDownloadButton from '../utils/PdfDownload';

// Definir estilos para el PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    marginBottom: 10,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 20,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCellHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  tableCell: {
    fontSize: 10,
  },
});

// Componente PDF Document
const MyDocument = ({ data = {}, title = 'Reporte' }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>Fecha: {new Date().toLocaleDateString()}</Text>
        <Text style={styles.text}>Generado por: {data.author || 'Usuario'}</Text>
        
        {data.items && data.items.length > 0 && (
          <View style={styles.table}>
            {/* Encabezados de tabla */}
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>ID</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Nombre</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Cantidad</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Precio</Text>
              </View>
            </View>
            
            {/* Filas de datos */}
            {data.items.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{item.id}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{item.name}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{item.quantity}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{item.price}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        
        <Text style={[styles.text, { marginTop: 30 }]}>
          {data.summary || 'Este es un PDF de ejemplo generado con @react-pdf/renderer.'}
        </Text>
      </View>
    </Page>
  </Document>
);

// Componente de ejemplo que utiliza el botón de descarga
const PDFExportExample = () => {
  // Datos de ejemplo para el PDF
  const exampleData = {
    author: 'Administrador',
    items: [
      { id: '001', name: 'Item 1', quantity: 5, price: '€100.00' },
      { id: '002', name: 'Item 2', quantity: 3, price: '€75.50' },
      { id: '003', name: 'Item 3', quantity: 8, price: '€45.00' },
    ],
    summary: 'Este reporte muestra los items seleccionados con sus cantidades y precios.'
  };

  return (
    <div className="pdf-export-example">
      <h2>Exportar a PDF</h2>
      <p>Haga clic en el botón de abajo para generar y descargar un PDF de ejemplo:</p>
      
      <PDFDownloadButton
        Document={MyDocument}
        documentProps={{ data: exampleData, title: 'Reporte de Items' }}
        fileName="reporte-ejemplo.pdf"
        buttonProps={{ className: 'pdf-button' }}
      >
        Descargar Reporte PDF
      </PDFDownloadButton>
    </div>
  );
};

export default PDFExportExample;
export { MyDocument }; // Exportamos el componente Document para reutilizarlo