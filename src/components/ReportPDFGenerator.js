// src/components/ReportPDFGenerator.js
import React, { useMemo } from "react";
import { Document, Page, Text, View, StyleSheet, Image, Link, Font } from "@react-pdf/renderer";
import CompressedImage from "./CompressedImage";
import { formatNumber, formatCurrency } from "../utils/calculationUtils";
import { useCalculationsService } from "../hooks/useCalculationsService";

// Registrar las fuentes personalizadas
Font.register({
  family: 'AtkinsonHyperlegible',
  fonts: [
    { src: `${process.env.PUBLIC_URL}/fonts/Atkinson-Hyperlegible-Regular-102.ttf`, fontWeight: 'normal', fontStyle: 'normal' },
    { src: `${process.env.PUBLIC_URL}/fonts/Atkinson-Hyperlegible-Regular-102.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
    { src: `${process.env.PUBLIC_URL}/fonts/Atkinson-Hyperlegible-Regular-102.ttf`, fontWeight: 'bold', fontStyle: 'normal' },
    { src: `${process.env.PUBLIC_URL}/fonts/Atkinson-Hyperlegible-Regular-102.ttf`, fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

Font.register({
  family: 'Cormorant',
  fonts: [
    { src: `${process.env.PUBLIC_URL}/fonts/Cormorant-Bold.ttf`, fontWeight: 'normal', fontStyle: 'normal' },
    { src: `${process.env.PUBLIC_URL}/fonts/Cormorant-Bold.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
    { src: `${process.env.PUBLIC_URL}/fonts/Cormorant-Bold.ttf`, fontWeight: 'bold', fontStyle: 'normal' },
    { src: `${process.env.PUBLIC_URL}/fonts/Cormorant-Bold.ttf`, fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

const styles = StyleSheet.create({
  // Estilo optimizado para la página
  page: { 
    padding: 18, 
    fontSize: 11, 
    fontFamily: "AtkinsonHyperlegible", 
    flexDirection: "column", 
    height: "100%" 
  },
  // Portada con estructura optimizada
  coverPage: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    justifyContent: "space-between",
    fontFamily: "AtkinsonHyperlegible"
  },
  logoSection: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { 
    width: 100, 
    height: 36
  },
  contentContainer: {
    marginTop: "auto",
  },
  title: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 25, 
    textAlign: "center", 
    fontFamily: "Cormorant" 
  },
  detailsTable: { display: "table", width: "100%", marginBottom: 18 },
  detailsRow: { flexDirection: "row" },
  detailsColLeft: { width: "50%", padding: 4, fontSize: 11 },
  detailsColRight: { width: "50%", padding: 4, textAlign: "right", fontSize: 11 },
  footer: { fontSize: 11, textAlign: "right", marginTop: 10 },
  
  // Secciones con margen vertical optimizado
  section: { marginBottom: 12 },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: "bold", 
    marginTop: 16, 
    marginBottom: 8, 
    fontFamily: "Cormorant" 
  },
  text: { fontSize: 11, marginBottom: 4 },
  link: { color: "#007bff", textDecoration: "underline", fontSize: 11 },
  
  // Imágenes que respetan el aspect ratio
  image: { height: 150, objectFit: "contain", margin: 4, border: "1px solid #000" },
  imageRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  
  // Tablas mejor espaciadas
  table: { display: "table", width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#000", marginTop: 8, marginBottom: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000" },
  tableHeader: { backgroundColor: "#f0f0f0", fontWeight: "bold", fontSize: 11 },
  tableCol: { width: "25%", borderRightWidth: 1, borderRightColor: "#000", padding: 4, fontSize: 11 },
  tableColWide: { width: "50%", borderRightWidth: 1, borderRightColor: "#000", padding: 4, fontSize: 11 },
  tableColLast: { width: "25%", padding: 4, fontSize: 11 },
  
  // Resumen de costos
  costSummary: { display: "table", width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#000", marginTop: 12, marginBottom: 12 },
  costRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000" },
  costColLabel: { width: "70%", padding: 4, fontWeight: "bold", fontSize: 11 },
  costColValue: { width: "30%", padding: 4, textAlign: "right", fontSize: 11 },
  
  // Mensajes de error de imagen
  errorImage: { width: 180, height: 150, backgroundColor: "#f0f0f0", textAlign: "center", padding: 5, fontSize: 10 },
  
  // Tabla de presupuesto
  budgetTable: {
    display: "table",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    marginTop: 8,
    marginBottom: 8
  },
  budgetRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  budgetTableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    fontSize: 11,
    padding: 4,
    textAlign: "center",
    width: "50%",
  },
  budgetTableCell: {
    padding: 4,
    fontSize: 11,
    width: "50%",
    textAlign: "left",
  },
  budgetTableCellAmount: {
    padding: 4,
    fontSize: 11,
    width: "50%",
    textAlign: "right",
  },
  
  // Página de resumen
  summaryPage: { 
    padding: 20, 
    fontSize: 11, 
    fontFamily: "AtkinsonHyperlegible", 
    flexDirection: "column" 
  },
  summaryTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 20, 
    textAlign: "center", 
    fontFamily: "Cormorant" 
  },
  summaryTable: { 
    display: "table", 
    width: "100%", 
    borderStyle: "solid", 
    borderWidth: 1, 
    borderColor: "#000", 
    marginBottom: 20 
  },
  summaryRow: { 
    flexDirection: "row", 
    borderBottomWidth: 1, 
    borderBottomColor: "#000" 
  },
  summaryLastRow: { 
    flexDirection: "row" 
  },
  summaryColLabel: { 
    width: "70%", 
    padding: 6, 
    fontSize: 11, 
    borderRightWidth: 1, 
    borderRightColor: "#000", 
    backgroundColor: "#f9f9f9" 
  },
  summaryColValue: { 
    width: "30%", 
    padding: 6, 
    fontSize: 11, 
    textAlign: "right" 
  },
  summaryHeaderRow: { 
    flexDirection: "row", 
    borderBottomWidth: 1, 
    borderBottomColor: "#000", 
    backgroundColor: "#f0f0f0" 
  },
  summaryHeaderCol: { 
    padding: 6, 
    fontSize: 11, 
    fontWeight: "bold", 
    textAlign: "center" 
  },
  summaryTotalRow: { 
    flexDirection: "row", 
    backgroundColor: "#f0f0f0" 
  },
  summaryTotalLabel: { 
    width: "70%", 
    padding: 6, 
    fontSize: 11, 
    fontWeight: "bold", 
    borderRightWidth: 1, 
    borderRightColor: "#000" 
  },
  summaryTotalValue: { 
    width: "30%", 
    padding: 6, 
    fontSize: 11, 
    fontWeight: "bold", 
    textAlign: "right" 
  },
  summaryNote: {
    fontSize: 10,
    fontStyle: "normal",
    marginTop: 15,
    textAlign: "center",
    color: "#666"
  },
  
  // Estilos para el nuevo diseño de 2 columnas
  mainHeader: {
    marginBottom: 10,
  },
  twoColumns: {
    flexDirection: "row",
    marginBottom: 12,
  },
  leftColumn: {
    width: "48%",
    marginRight: "2%",
  },
  rightColumn: {
    width: "48%",
    marginLeft: "2%",
  },
  fullWidth: {
    width: "100%",
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 4,
    fontFamily: "Cormorant"
  },
  materialsList: {
    marginTop: 4,
    marginBottom: 4,
  },
  materialItem: {
    fontSize: 11,
    marginBottom: 2,
  },
  workDescription: {
    marginTop: 4,
    marginBottom: 8,
  },
  
  // Estilos para trabajos extra
  extraWorkBadge: {
    backgroundColor: '#fff8e1',
    padding: 5,
    marginBottom: 5,
    borderRadius: 3
  },
  extraWorkText: {
    fontSize: 10,
    color: '#e67e22',
    fontWeight: 'bold'
  },
  extraWorkSection: {
    backgroundColor: '#fff8e1',
    borderBottomWidth: 1,
    borderBottomColor: '#e67e22',
  }
});

// Componente principal del PDF
const ReportPDFGenerator = ({ reports, projects }) => {
  // Usar el servicio centralizado de cálculos
  const { 
    calculateLabor, 
    calculateMaterials, 
    calculateReportSummary, 
    calculateBudget 
  } = useCalculationsService();

  // Ordenar los reportes por fecha (del más antiguo al más nuevo)
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const dateA = new Date(a.reportDate);
      const dateB = new Date(b.reportDate);
      return dateA - dateB; // Orden ascendente (antiguo a nuevo)
    });
  }, [reports]);

  const firstReport = sortedReports[0];
  const project = projects.find((p) => p.id === firstReport?.projectId) || {};
  const currentDate = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Obtener totales calculados desde el servicio
  const { totals } = calculateReportSummary(sortedReports, projects, firstReport?.projectId);

  // Función para generar el título con soporte para múltiples semanas
  const renderTitle = () => {
    if (!reports || reports.length === 0) {
      return "Acta de obra";
    }
    
    // Obtener todos los números de semana únicos
    const uniqueWeeks = [...new Set(reports.map(report => report.weekNumber))].sort((a, b) => a - b);
    const year = new Date(firstReport.reportDate).getFullYear();
    
    // Si hay una sola semana
    if (uniqueWeeks.length === 1) {
      return `Acta semanal de obra - Semana ${uniqueWeeks[0]} - Año ${year}`;
    }
    
    // Si son semanas consecutivas
    if (uniqueWeeks.length === uniqueWeeks[uniqueWeeks.length - 1] - uniqueWeeks[0] + 1) {
      return `Acta semanal de obra - Semanas ${uniqueWeeks[0]} a ${uniqueWeeks[uniqueWeeks.length - 1]} - Año ${year}`;
    }
    
    // Si son semanas no consecutivas
    return `Acta semanal de obra - Semanas ${uniqueWeeks.join(', ')} - Año ${year}`;
  };

  // Función para renderizar imágenes
  const renderImage = (src) => {
    try {
      if (!src || typeof src !== "string" || !src.startsWith("http")) {
        return (
          <View style={styles.errorImage}>
            <Text>Imagen no disponible</Text>
          </View>
        );
      }
      // Usar el componente CompressedImage en lugar de Image directamente
      return <CompressedImage 
              src={src} 
              style={styles.image} 
              maxWidth={600} 
              maxHeight={500} 
              quality={0.5} // Puedes ajustar la calidad aquí (0.1 a 1)
            />;
    } catch (error) {
      console.error("Error al cargar imagen en PDF:", error);
      return (
        <View style={styles.errorImage}>
          <Text>Imagen no disponible</Text>
        </View>
      );
    }
  };

  // Verificar si hay trabajos extra
  const hasExtraWork = sortedReports.some(report => report.isExtraWork);

  return (
    <Document>
      {/* Portada */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.logoSection}>
          <Image src={`${process.env.PUBLIC_URL}/assets/logo.png`} style={styles.logo} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            {renderTitle()}
          </Text>
          <View style={styles.detailsTable}>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsColLeft}>Promotor: {project.client || "No disponible"}</Text>
              <Text style={styles.detailsColRight}>Redactado por: Jesús Moral Abásolo</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsColLeft}>NIF/NIE: {project.nifNie || "No disponible"}</Text>
              <Text style={styles.detailsColRight}>NIF: 75902042H</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsColLeft}>Proyecto: {project.id || "No disponible"}</Text>
              <Text style={styles.detailsColRight}>Arquitecto técnico y artesano</Text>
            </View>
              <Text style={styles.detailsColLeft}>Dirección: {project.address || "No disponible"}</Text>
          </View>
          <Text style={styles.footer}>{currentDate}</Text>
        </View>
      </Page>

      {/* Páginas por parte diario */}
      {sortedReports.map((report, index) => {
        const project = projects.find((p) => p.id === report.projectId) || {};
        const isHourly = project.type === "hourly";
        
        // Usar servicios centralizados para cálculos
        // **CORRECCIÓN**: Usamos la función de budgetUtils corregida
        const budgetSummary = project.type === "fixed" 
          ? calculateBudget(project, reports) // Pasamos todos los reportes para el cálculo correcto
          : { budgetAmount: 0, invoicedTotal: 0, remainingBudget: 0 };
          
        // Calcular datos de labor y materiales si aplica
        const laborCalcs = report.labor ? calculateLabor(report.labor, project) : null;
        const materialsCalcs = report.materials ? calculateMaterials(report.materials) : null;
        
        // Determinar si es un trabajo extra y su tipo
        const isExtraWork = report.isExtraWork;
        const extraWorkType = isExtraWork ? report.extraWorkType : null;

        return (
          <Page key={`report-${index}`} size="A4" style={styles.page}>
            {/* Cabecera del parte */}
            <View style={styles.mainHeader}>
              <Text style={styles.sectionTitle}>Fecha: {new Date(report.reportDate).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11, marginRight: 20 }}>Semana: {report.weekNumber}</Text>
                <Text style={{ fontSize: 11, marginRight: 20 }}>Proyecto: {report.projectId || "No disponible"}</Text>
                <Text style={{ fontSize: 11 }}>Cliente: {project.client || "No disponible"}</Text>
              </View>
              <Text style={{ fontSize: 11 }}>Dirección: {project.address || "No disponible"}</Text>
              
              {/* Indicador de trabajo extra */}
              {isExtraWork && (
                <View style={styles.extraWorkBadge}>
                  <Text style={styles.extraWorkText}>
                    {extraWorkType === "hourly" 
                      ? "TRABAJO EXTRA POR HORAS" 
                      : "TRABAJO EXTRA CON PRESUPUESTO ADICIONAL"}
                  </Text>
                </View>
              )}
            </View>

            {/* Distribución en dos columnas */}
            <View style={styles.twoColumns}>
              {/* Columna izquierda - Mano de obra o presupuesto */}
              <View style={styles.leftColumn}>
                {isHourly || (isExtraWork && extraWorkType === "hourly") ? (
                  <>
                    <Text style={styles.subSectionTitle}>Mano de obra</Text>
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
                        <Text style={styles.tableCol}>{formatNumber(laborCalcs?.officialHours || 0)}</Text>
                        <Text style={styles.tableCol}>{formatNumber(laborCalcs?.workerHours || 0)}</Text>
                      </View>
                      <View style={styles.tableRow}>
                        <Text style={styles.tableColWide}>Coste</Text>
                        <Text style={styles.tableCol}>{formatCurrency(laborCalcs?.officialCost || 0)}</Text>
                        <Text style={styles.tableCol}>{formatCurrency(laborCalcs?.workerCost || 0)}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, marginTop: 4 }}>Coste total mano de obra: {formatCurrency(laborCalcs?.totalLaborCost || 0)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.subSectionTitle}>
                      {isExtraWork ? "Presupuesto adicional (extra)" : "Presupuesto cerrado"}
                    </Text>
                    <View style={styles.budgetTable}>
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetTableHeader}>Concepto</Text>
                        <Text style={styles.budgetTableHeader}>Importe</Text>
                      </View>
                      
                      {isExtraWork ? (
                        <View style={styles.budgetRow}>
                          <Text style={styles.budgetTableCell}>Importe extra presupuestado</Text>
                          <Text style={styles.budgetTableCellAmount}>{formatCurrency(report.extraBudgetAmount || 0)}</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.budgetRow}>
                            <Text style={styles.budgetTableCell}>Importe presupuestado</Text>
                            <Text style={styles.budgetTableCellAmount}>{formatCurrency(budgetSummary.budgetAmount)}</Text>
                          </View>
                          <View style={styles.budgetRow}>
                            <Text style={styles.budgetTableCell}>Importe facturado (de este parte)</Text>
                            <Text style={styles.budgetTableCellAmount}>{formatCurrency(report.invoicedAmount || 0)}</Text>
                          </View>
                          <View style={styles.budgetRow}>
                            <Text style={styles.budgetTableCell}>Total facturado (acumulado)</Text>
                            <Text style={styles.budgetTableCellAmount}>{formatCurrency(budgetSummary.invoicedTotal)}</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </>
                )}
              </View>

              {/* Columna derecha - Materiales */}
              <View style={styles.rightColumn}>
                <Text style={styles.subSectionTitle}>Materiales</Text>
                <View style={styles.materialsList}>
                  {report.materials && report.materials.length > 0 ? (
                    <>
                      <Text style={{ fontSize: 11, marginBottom: 4 }}>Descripción materiales comprados:</Text>
                      {report.materials.map((m, i) => (
                        <Text key={`material-desc-${i}`} style={styles.materialItem}>
                          - {m.description || "Sin descripción"}
                        </Text>
                      ))}
                      <Text style={{ fontSize: 11, marginTop: 6, marginBottom: 2 }}>Albaranes/facturas:</Text>
                      {report.materials.map((m, i) => (
                        <Text key={`material-invoice-${i}`} style={styles.materialItem}>
                          Factura {i + 1} (
                          <Link src={m.invoiceUrl} style={styles.link}>
                            Descargar PDF
                          </Link>
                          )
                        </Text>
                      ))}
                    </>
                  ) : (
                    <Text style={{ fontSize: 11 }}>No hay materiales registrados.</Text>
                  )}
                  <Text style={{ fontSize: 11, marginTop: 6 }}>Coste total de materiales: {formatCurrency(materialsCalcs?.totalMaterialsCost || 0)}</Text>
                </View>
              </View>
            </View>

            {/* Resumen de costes (ancho completo) */}
            {(isHourly || (isExtraWork && extraWorkType === "hourly")) && (
              <View style={styles.fullWidth}>
                <Text style={styles.subSectionTitle}>Coste total MO + materiales</Text>
                <View style={styles.costSummary}>
                  <View style={styles.costRow}>
                    <Text style={styles.costColLabel}>Coste total mano de obra</Text>
                    <Text style={styles.costColValue}>{formatCurrency(laborCalcs?.totalLaborCost || 0)}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costColLabel}>Coste total de materiales</Text>
                    <Text style={styles.costColValue}>{formatCurrency(materialsCalcs?.totalMaterialsCost || 0)}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costColLabel}>Coste total MO + materiales</Text>
                    <Text style={styles.costColValue}>{formatCurrency(
                      (laborCalcs?.totalLaborCost || 0) + (materialsCalcs?.totalMaterialsCost || 0)
                    )}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Trabajos realizados (ancho completo) */}
            <View style={styles.fullWidth}>
              <Text style={styles.subSectionTitle}>Trabajos realizados</Text>
              <View style={styles.workDescription}>
                <Text style={{ fontSize: 11 }}>{report.workPerformed?.description || "Sin descripción"}</Text>
              </View>
            </View>

            {/* Fotografías (ancho completo) */}
            <View style={styles.fullWidth}>
              <Text style={styles.subSectionTitle}>Fotografías</Text>
              <View style={styles.imageRow}>
                {report.workPerformed?.photos?.map((photo, i) => (
                  <View key={`photo-${i}`}>{renderImage(photo.url)}</View>
                ))}
                {(!report.workPerformed?.photos || report.workPerformed.photos.length === 0) && (
                  <Text style={{ fontSize: 11 }}>No hay fotografías disponibles</Text>
                )}
              </View>
            </View>
          </Page>
        );
      })}

      {/* Página de resumen de totales */}
      <Page size="A4" style={styles.summaryPage}>
        <Text style={styles.summaryTitle}>
          Resumen de Totales - Proyecto {project.id}
        </Text>
        
        <View style={styles.detailsTable}>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsColLeft}>Promotor: {project.client || "No disponible"}</Text>
            <Text style={styles.detailsColRight}>Fecha: {currentDate}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsColLeft}>Proyecto: {project.address || "No disponible"}</Text>
            <Text style={styles.detailsColRight}>Tipo: {project.type === "hourly" ? "Por horas" : "Presupuesto cerrado"}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsColLeft}>Período: {renderTitle().replace('Acta semanal de obra - ', '')}</Text>
            <Text style={styles.detailsColRight}>Total partes: {reports.length}</Text>
          </View>
        </View>

        {project.type === "hourly" ? (
          <View style={styles.summaryTable}>
            <View style={styles.summaryHeaderRow}>
              <Text style={{...styles.summaryHeaderCol, width: "70%"}}>Concepto</Text>
              <Text style={{...styles.summaryHeaderCol, width: "30%"}}>Importe</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryColLabel}>Total mano de obra (Ingresos)</Text>
              <Text style={styles.summaryColValue}>{formatCurrency(totals.totalLabor)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryColLabel}>Total materiales (Coste)</Text>
              <Text style={styles.summaryColValue}>{formatCurrency(totals.totalMaterials)}</Text>
            </View>
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>TOTAL COSTE OPERATIVO</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(totals.totalCost)}</Text>
            </View>
          </View>
        ) : ( // Lógica para proyectos de presupuesto cerrado
          (() => {
            // **CORRECCIÓN**: Usamos la función de budgetUtils corregida para obtener los valores correctos
            const finalBudget = calculateBudget(project, sortedReports);

            return (
              <View style={styles.summaryTable}>
                <View style={styles.summaryHeaderRow}>
                  <Text style={{ ...styles.summaryHeaderCol, width: "70%" }}>Concepto</Text>
                  <Text style={{ ...styles.summaryHeaderCol, width: "30%" }}>Importe</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryColLabel}>Presupuesto Original</Text>
                  <Text style={styles.summaryColValue}>{formatCurrency(finalBudget.budgetAmount)}</Text>
                </View>
                
                {/* Mostramos la sección de extras solo si existen */}
                {finalBudget.totalExtraWorkIncome > 0 && (
                  <>
                    <View style={[styles.summaryRow, styles.extraWorkSection]}>
                        <Text style={[styles.summaryColLabel, { color: '#e67e22', fontWeight: 'bold' }]}>
                            Ingresos por Trabajos Extra
                        </Text>
                        <Text style={[styles.summaryColValue, { color: '#e67e22', fontWeight: 'bold' }]}>
                            {formatCurrency(finalBudget.totalExtraWorkIncome)}
                        </Text>
                    </View>
                  </>
                )}
                
                <View style={styles.summaryTotalRow}>
                  <Text style={styles.summaryTotalLabel}>PRESUPUESTO TOTAL (CON EXTRAS)</Text>
                  <Text style={styles.summaryTotalValue}>{formatCurrency(finalBudget.totalBudgetWithExtras)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryColLabel}>Total Facturado (del presupuesto original)</Text>
                  <Text style={styles.summaryColValue}>{formatCurrency(finalBudget.invoicedTotal)}</Text>
                </View>

                <View style={styles.summaryTotalRow}>
                  <Text style={styles.summaryTotalLabel}>IMPORTE RESTANTE</Text>
                  <Text style={styles.summaryTotalValue}>{formatCurrency(finalBudget.remainingBudget)}</Text>
                </View>
              </View>
            );
          })()
        )}

        <Text style={styles.summaryNote}>
          Este resumen incluye todos los partes diarios seleccionados en el rango de fechas especificado.
          {hasExtraWork ? " Los trabajos extra se muestran sumados al presupuesto original para calcular el total real del proyecto." : ""}
        </Text>
      </Page>
    </Document>
  );
};

export default ReportPDFGenerator;