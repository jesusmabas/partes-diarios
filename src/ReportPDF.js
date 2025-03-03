import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Link } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 12 },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 10 },
  text: { marginBottom: 5 },
  table: { display: "table", width: "100%", borderStyle: "solid", borderWidth: 1 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1 },
  tableCol: { width: "25%", borderRightWidth: 1, padding: 5 },
  tableColLast: { width: "25%", padding: 5 },
  image: { width: 200, height: 150, marginVertical: 10 }
});

const ReportPDF = ({ reports }) => (
  <Document>
    {reports.map((report, index) => (
      <Page key={index} size="A4" style={styles.page}>
        <Text style={styles.title}>Parte del {new Date(report.reportDate).toLocaleDateString()}</Text>
        <Text>Proyecto: {report.projectId}</Text>
        <Text>Cliente: {report.client || "No disponible"}</Text>

        <Text style={styles.title}>Mano de obra</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCol}>Horas trabajadas</Text>
            <Text style={styles.tableColLast}>{report.labor.officialHours} (Oficial) / {report.labor.workerHours} (Peón)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCol}>Coste total</Text>
            <Text style={styles.tableColLast}>{report.totalCost}€</Text>
          </View>
        </View>

        <Text style={styles.title}>Trabajos realizados</Text>
        <Text>{report.workPerformed.description}</Text>
        {report.workPerformed.photos.map((photo, i) => (
          <Image key={i} src={photo} style={styles.image} />
        ))}
      </Page>
    ))}
  </Document>
);

export default ReportPDF;
