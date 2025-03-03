import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Link } from "@react-pdf/renderer";
import { formatNumber, formatCurrency, formatFullDate } from "../utils/formatters";
import { useProjects } from "../hooks/useProjects"; // Para obtener el tipo del proyecto

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 12, fontFamily: "Helvetica", flexDirection: "column", height: "100%" },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { width: 100, height: 36, marginBottom: 0, alignSelf: "center" },
  contentContainer: {
    flex: 1,
    justifyContent: "flex-end",
    marginTop: "auto",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 30, textAlign: "center", fontFamily: "Times-Roman" },
  detailsTable: { display: "table", width: "100%", marginBottom: 20 },
  detailsRow: { flexDirection: "row" },
  detailsColLeft: { width: "50%", padding: 5 },
  detailsColRight: { width: "50%", padding: 5, textAlign: "right" },
  footer: { fontSize: 12, textAlign: "right", marginTop: 10 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginTop: 15, marginBottom: 10, fontFamily: "Times-Roman" },
  text: { fontSize: 11, marginBottom: 5 },
  link: { color: "#007bff", textDecoration: "underline", fontSize: 11 },
  image: { width: 200, height: 150, margin: 5, border: "1px solid #000" },
  imageRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  table: { display: "table", width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#000" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000" },
  tableHeader: { backgroundColor: "#f0f0f0", fontWeight: "bold", fontSize: 11 },
  tableCol: { width: "25%", borderRightWidth: 1, borderRightColor: "#000", padding: 5, fontSize: 11 },
  tableColWide: { width: "50%", borderRightWidth: 1, borderRightColor: "#000", padding: 5, fontSize: 11 },
  tableColLast: { width: "25%", padding: 5, fontSize: 11 },
  costSummary: { display: "table", width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#000", marginTop: 20 },
  costRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000" },
  costColLabel: { width: "70%", padding: 5, fontWeight: "bold", fontSize: 11 },
  costColValue: { width: "30%", padding: 5, textAlign: "right", fontSize: 11 },
  errorImage: { width: 200, height: 150, backgroundColor: "#f0f0f0", textAlign: "center", padding: 10, fontSize: 10 },
});

const ReportPDFGenerator = ({ reports, projects }) => {
  const firstReport = reports[0];
  const project = projects.find((p) => p.id === firstReport?.projectId) || {};
  const currentDate = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const renderImage = (src) => {
    try {
      if (!src || typeof src !== "string" || !src.startsWith("http")) {
        return (
          <View style={styles.errorImage}>
            <Text>Imagen no disponible</Text>
          </View>
        );
      }
      return <Image src={src} style={styles.image} />;
    } catch (error) {
      console.error("Error al cargar imagen en PDF:", error);
      return (
        <View style={styles.errorImage}>
          <Text>Imagen no disponible</Text>
        </View>
      );
    }
  };

  // Calcular importe facturado total para proyectos "fixed"
  const calculateInvoicedTotal = (projectId) => {
    const projectReports = reports.filter((report) => report.projectId === projectId && report.invoicedAmount);
    return projectReports.reduce((sum, report) => sum + (report.invoicedAmount || 0), 0);
  };

  return (
    <Document>
      {/* Portada */}
      <Page size="A4" style={styles.page}>
        <View style={styles.logoContainer}>
          <Image src="/assets/logo.png" style={styles.logo} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            Acta semanal de obra - Semana {firstReport?.weekNumber || 0} - Año {new Date(firstReport?.reportDate).getFullYear() || 2025}
          </Text>
          <View style={styles.detailsTable}>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsColLeft}>Promotor: {project.client || "No disponible"}</Text>
              <Text style={styles.detailsColRight}>Redactado por: Jesús Moral Abisolo</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsColLeft}>NIF/NIE: {project.nifNie || "No disponible"}</Text>
              <Text style={styles.detailsColRight}>NIF: 75902042H</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsColLeft}>Proyecto: {project.address || "No disponible"}</Text>
              <Text style={styles.detailsColRight}>Arquitecto técnico y artesano</Text>
            </View>
          </View>
          <Text style={styles.footer}>{currentDate}</Text>
        </View>
      </Page>

      {/* Páginas por parte diario */}
      {reports.map((report, index) => {
        const project = projects.find((p) => p.id === report.projectId) || {};
        const isHourly = project.type === "hourly";
        const budgetAmount = project.budgetAmount || 0;
        const invoicedTotal = project.type === "fixed" ? calculateInvoicedTotal(project.id) : 0;
        const remainingToInvoice = budgetAmount - invoicedTotal;

        return (
          <Page key={`report-${index}`} size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>Fecha: {formatFullDate(report.reportDate)}</Text>
            <Text>Semana: {report.weekNumber}</Text>
            <Text>Proyecto: {report.projectId || "No disponible"}</Text>
            <Text>Cliente: {project.client || "No disponible"}</Text>
            <Text>Dirección: {project.address || "No disponible"}</Text>

            {isHourly ? (
              <>
                <Text style={styles.sectionTitle}>Mano de obra</Text>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={styles.tableColWide}> </Text>
                    <Text style={styles.tableCol}>Oficial</Text>
                    <Text style={styles.tableCol}>Peón</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColWide}>Hora de entrada</Text>
                    <Text style={styles.tableCol}>{report.labor?.officialEntry || "--:--"}</Text>
                    <Text style={styles.tableCol}>{report.labor?.workerEntry || "--:--"}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColWide}>Hora de salida</Text>
                    <Text style={styles.tableCol}>{report.labor?.officialExit || "--:--"}</Text>
                    <Text style={styles.tableCol}>{report.labor?.workerExit || "--:--"}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColWide}>Horas trabajadas</Text>
                    <Text style={styles.tableCol}>{formatNumber(report.labor?.officialHours || 0)}</Text>
                    <Text style={styles.tableCol}>{formatNumber(report.labor?.workerHours || 0)}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColWide}>Coste</Text>
                    <Text style={styles.tableCol}>{formatCurrency(report.labor?.officialCost || 0)}</Text>
                    <Text style={styles.tableCol}>{formatCurrency(report.labor?.workerCost || 0)}</Text>
                  </View>
                </View>
                <Text style={styles.text}>Coste total mano de obra: {formatCurrency(report.labor?.totalLaborCost || 0)}</Text>

                <Text style={styles.sectionTitle}>Materiales</Text>
                <Text style={styles.text}>Descripción materiales comprados:</Text>
                {report.materials?.map((m, i) => (
                  <Text key={`material-desc-${i}`} style={styles.text}>
                    - {m.description || "Sin descripción"}
                  </Text>
                ))}
                <Text style={styles.text}>Albaranes/facturas:</Text>
                {report.materials?.map((m, i) => (
                  <Text key={`material-invoice-${i}`} style={styles.text}>
                    Factura {i + 1} (<Link src={m.invoiceUrl} style={styles.link}>Descargar PDF</Link>)
                  </Text>
                ))}
                <Text style={styles.text}>Coste total de materiales: {formatCurrency(report.totalMaterialsCost || 0)}</Text>
              </>
            ) : (
              <>
                <Text style={styles.text}>Proyecto con presupuesto cerrado - No se registran horas ni materiales.</Text>
                <Text style={styles.text}><strong>Importe presupuestado:</strong> {formatCurrency(budgetAmount)}</Text>
                <Text style={styles.text}><strong>Importe facturado:</strong> {formatCurrency(invoicedTotal)}</Text>
                <Text style={styles.text}><strong>Resta por facturar:</strong> {formatCurrency(remainingToInvoice)}</Text>
                {report.invoicedAmount > 0 && (
                  <Text style={styles.text}>Facturado hoy: {formatCurrency(report.invoicedAmount)}</Text>
                )}
              </>
            )}

            <Text style={styles.sectionTitle}>Trabajos realizados</Text>
            <Text style={styles.text}>{report.workPerformed?.description || "Sin descripción"}</Text>

            <Text style={styles.sectionTitle}>Fotografías</Text>
            <View style={styles.imageRow}>
              {report.workPerformed?.photos?.map((photo, i) => (
                <View key={`photo-${i}`}>{renderImage(photo.url)}</View>
              ))}
            </View>

            {isHourly && (
              <>
                <Text style={styles.sectionTitle}>Coste total MO + materiais</Text>
                <View style={styles.costSummary}>
                  <View style={styles.costRow}>
                    <Text style={styles.costColLabel}>Coste total mano de obra</Text>
                    <Text style={styles.costColValue}>{formatCurrency(report.labor?.totalLaborCost || 0)}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costColLabel}>Coste total de materiais</Text>
                    <Text style={styles.costColValue}>{formatCurrency(report.totalMaterialsCost || 0)}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costColLabel}>Coste total MO + materiais</Text>
                    <Text style={styles.costColValue}>{formatCurrency(report.totalCost || 0)}</Text>
                  </View>
                </View>
              </>
            )}
          </Page>
        );
      })}
    </Document>
  );
};

export default ReportPDFGenerator;