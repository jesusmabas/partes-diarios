import React, { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { collection, getDocs, query, orderBy, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, Link } from "@react-pdf/renderer";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("partes"); // Estado para alternar entre pestañas
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [report, setReport] = useState({
    weekStartDate: "",
    reportDate: new Date().toISOString().split("T")[0],
    labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
    materials: [],
    workPerformed: { description: "", photos: [] },
  });
  const [newMaterial, setNewMaterial] = useState({ description: "", cost: "" }); // Estado para nuevo material
  const [dailyReports, setDailyReports] = useState([]); // Estado para almacenar partes diarios
  const [reportRange, setReportRange] = useState({ startDate: "", endDate: "" }); // Rango de fechas para informes

  // Cargar proyectos al iniciar
  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, "projects"));
      const projectsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProjects(projectsData);
    };
    fetchProjects();
  }, []);

  // Cargar partes diarios (usado en informes)
  useEffect(() => {
    const fetchDailyReports = async () => {
      const q = query(collection(db, "dailyReports"), orderBy("reportDate", "desc"));
      const querySnapshot = await getDocs(q);
      const reportsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDailyReports(reportsData);
    };
    fetchDailyReports();
  }, []);

  // Cambiar proyecto seleccionado
  const handleProjectChange = (e) => {
    const project = projects.find((p) => p.id === e.target.value);
    setSelectedProject(project);
  };

  // Calcular horas y costes de mano de obra
  const calculateLabor = () => {
    const { officialEntry, officialExit, workerEntry, workerExit } = report.labor;
    const officialHours = officialEntry && officialExit
      ? (new Date(`2025-01-01T${officialExit}`) - new Date(`2025-01-01T${officialEntry}`)) / 3600000
      : 0;
    const workerHours = workerEntry && workerExit
      ? (new Date(`2025-01-01T${workerExit}`) - new Date(`2025-01-01T${workerEntry}`)) / 3600000
      : 0;
    const officialCost = officialHours * (selectedProject?.officialPrice || 0);
    const workerCost = workerHours * (selectedProject?.workerPrice || 0);
    return {
      officialHours,
      workerHours,
      officialCost,
      workerCost,
      totalLaborCost: officialCost + workerCost,
    };
  };

  // Calcular número de semana
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  // Formatear números
  const formatNumber = (num) => parseFloat(num).toFixed(2);
  const formatCurrency = (num) => `€${formatNumber(num)}`;

  // Formatear fecha completa
  const formatFullDate = (date) => {
    return new Date(date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  // Subir archivo a Storage
  const uploadFile = async (file, folder, fileName) => {
    const storageRef = ref(storage, `${folder}/${fileName}`);
    try {
      console.log("Intentando subir archivo:", file.name, "a:", `${folder}/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      console.log("Archivo subido con éxito. URL:", url); // Depuración
      return url;
    } catch (error) {
      console.error("Error detallado al subir el archivo:", error);
      if (error.code) {
        console.error("Código de error Firebase:", error.code);
        console.error("Mensaje de error:", error.message);
        console.error("Payload de error:", error.customData || error.serverResponse || "No disponible");
      }
      throw new Error(`Error al subir el archivo: ${error.message || "Desconocido"}`);
    }
  };

  // Añadir material
  const handleAddMaterial = async (e) => {
    const file = e.target.files[0];
    if (file && newMaterial.description && newMaterial.cost) {
      try {
        // Normaliza el nombre del archivo, reemplazando espacios y caracteres especiales
        const fileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        console.log("Subiendo material:", file.name, "normalizado a:", fileName, "con descripción:", newMaterial.description, "y coste:", newMaterial.cost);
        const url = await uploadFile(file, "invoices", `${selectedProject?.id}_${report.reportDate}_${fileName}`);
        console.log("Material subido con éxito. URL:", url);
        const cost = parseFloat(newMaterial.cost) || 0;
        setReport({
          ...report,
          materials: [...report.materials, { description: newMaterial.description, invoiceUrl: url, cost }],
        });
        setNewMaterial({ description: "", cost: "" }); // Limpiar el formulario
      } catch (error) {
        console.error("Error detallado al subir material:", error);
        if (error.code) {
          console.error("Código de error Firebase:", error.code);
          console.error("Mensaje de error:", error.message);
          console.error("Payload de error:", error.customData || error.serverResponse || "No disponible");
        }
        alert(`Error al subir el material: ${error.message}. Revisa la consola para más detalles.`);
      }
    } else {
      alert("Por favor, completa la descripción y el coste antes de subir el archivo.");
    }
  };

  // Añadir foto
  const handleAddPhoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Normaliza el nombre del archivo, manteniendo la extensión
        const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        console.log("Subiendo foto:", file.name, "normalizado a:", fileName);
        const url = await uploadFile(file, "photos", `${selectedProject?.id}_${report.reportDate}_${fileName}`);
        console.log("Foto subida con éxito. URL:", url);
        // Verifica que la URL tenga una extensión válida
        if (!url.match(/\.(jpg|jpeg|png|gif)$/i)) {
          console.warn("URL generada no tiene extensión válida:", url);
        }
        setReport({
          ...report,
          workPerformed: { ...report.workPerformed, photos: [...report.workPerformed.photos, url] },
        });
      } catch (error) {
        console.error("Error detallado al subir foto:", error);
        if (error.code) {
          console.error("Código de error Firebase:", error.code);
          console.error("Mensaje de error:", error.message);
          console.error("Payload de error:", error.customData || error.serverResponse || "No disponible");
        }
        alert(`Error al subir la foto: ${error.message}. Revisa la consola para más detalles.`);
      }
    }
  };

  // Guardar el parte diario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      alert("Selecciona un proyecto primero");
      return;
    }

    const laborData = calculateLabor();
    const totalMaterialsCost = report.materials.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalCost = laborData.totalLaborCost + totalMaterialsCost;

    const reportData = {
      projectId: selectedProject.id,
      weekStartDate: report.weekStartDate,
      weekNumber: getWeekNumber(report.weekStartDate),
      reportDate: report.reportDate,
      labor: { ...report.labor, ...laborData },
      materials: report.materials,
      totalMaterialsCost,
      totalCost,
      workPerformed: report.workPerformed,
    };

    await addDoc(collection(db, "dailyReports"), reportData);
    alert("Parte guardado correctamente!");
    setReport({
      weekStartDate: "",
      reportDate: new Date().toISOString().split("T")[0],
      labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
      materials: [],
      workPerformed: { description: "", photos: [] },
    });
    setNewMaterial({ description: "", cost: "" }); // Limpiar el formulario de material
  };

  // Filtrar y ordenar partes por rango de fechas (de más antiguo a más reciente)
  const filterAndSortReportsByDate = () => {
    if (!reportRange.startDate || !reportRange.endDate) return [];
    return dailyReports
      .filter((report) => {
        const reportDate = new Date(report.reportDate);
        const start = new Date(reportRange.startDate);
        const end = new Date(reportRange.endDate);
        return reportDate >= start && reportDate <= end;
      })
      .sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate)); // Orden ascendente por fecha
  };

  // Estilos para el PDF
  const styles = StyleSheet.create({
    page: { padding: 20, fontSize: 12, fontFamily: "Helvetica" }, // Fuente predeterminada para el cuerpo
    header: { marginBottom: 20, textAlign: "center" }, // Eliminamos fontFamily para usar la imagen
    subHeader: { fontSize: 18, marginBottom: 30, textAlign: "center", fontFamily: "Times-Roman" }, // Mantenemos Times-Roman para headings
    section: { marginBottom: 20 },
    title: { fontSize: 14, fontWeight: "bold", marginBottom: 10, fontFamily: "Times-Roman" }, // Mantenemos Times-Roman para headings
    text: { marginBottom: 5, fontSize: 12, fontFamily: "Helvetica" }, // Fuente Helvetica para el cuerpo
    table: { display: "table", width: "100%", borderStyle: "solid", borderWidth: 1, borderColor: "#000" },
    tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000" },
    tableCol: { width: "25%", borderRightWidth: 1, borderRightColor: "#000", padding: 5, fontSize: 12, fontFamily: "Helvetica" },
    tableColLast: { width: "25%", padding: 5, fontSize: 12, fontFamily: "Helvetica" },
    image: { width: 200, height: 150, marginVertical: 10 }, // Estilo para las imágenes de trabajos realizados
    logo: { width: 300, height: 108, marginVertical: 10, alignSelf: "center" }, // Ajustamos proporción 423x152 (2.78:1) a 300x108
    link: { color: "blue", textDecoration: "underline", fontFamily: "Helvetica" },
    footer: { fontSize: 12, textAlign: "right", marginTop: 20, fontFamily: "Helvetica" },
    errorImage: { width: 200, height: 150, backgroundColor: "#f0f0f0", textAlign: "center", padding: 10, fontSize: 10, fontFamily: "Helvetica" },
    detailsTable: { display: "table", width: "100%", marginBottom: 20 },
    detailsRow: { flexDirection: "row" },
    detailsColLeft: { width: "50%", padding: 5, fontSize: 12, fontFamily: "Helvetica" },
    detailsColRight: { width: "50%", padding: 5, fontSize: 12, fontFamily: "Helvetica", textAlign: "right" },
  });

  // Componente PDF
  const ReportPDF = ({ reports }) => {
    const renderImage = (src) => {
      try {
        // Si la URL no tiene extensión, asumimos que es válida si viene de Firebase Storage
        if (!src) {
          console.warn("URL de imagen vacía, omitiendo renderizado:", src);
          return (
            <View style={styles.errorImage}>
              <Text>Imagen no disponible</Text>
            </View>
          );
        }
        // Si la URL no tiene extensión válida pero es de Firebase Storage, intentamos renderizarla
        if (!src.match(/\.(jpg|jpeg|png|gif)$/i) && src.includes("firebasestorage.googleapis.com")) {
          console.log("Renderizando URL de Firebase Storage sin extensión explícita:", src);
          return <Image src={src} style={styles.image} />;
        }
        // Si no es una URL de Firebase Storage y no tiene extensión válida, mostramos error
        if (!src.match(/\.(jpg|jpeg|png|gif)$/i)) {
          console.warn("URL de imagen inválida o sin extensión válida, omitiendo renderizado:", src);
          return (
            <View style={styles.errorImage}>
              <Text>Imagen no disponible</Text>
            </View>
          );
        }
        return <Image src={src} style={styles.image} />;
      } catch (error) {
        console.error("Error al cargar la imagen:", error);
        return (
          <View style={styles.errorImage}>
            <Text>Imagen no disponible</Text>
          </View>
        );
      }
    };

    // Obtener el primer y último reporte para determinar el rango de fechas
    const firstReport = reports[0];
    const lastReport = reports[reports.length - 1];
    const weekNumber = firstReport ? getWeekNumber(firstReport.reportDate) : null;
    const startDate = firstReport ? formatFullDate(firstReport.reportDate) : "Sin fechas disponibles";
    const endDate = lastReport ? formatFullDate(lastReport.reportDate) : "Sin fechas disponibles";

    // Obtener datos del proyecto (si hay al menos un reporte)
    const firstProject = firstReport ? projects.find((p) => p.id === firstReport.projectId) : null;
    const promoter = firstProject?.client || "No disponible";
    const nifNie = firstProject?.nifNie || "No disponible";
    const projectId = firstProject?.id || "No disponible";

    // Ordenar reports por fecha (ascendente)
    const sortedReports = [...reports].sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));

    return (
      <Document>
        {/* Portada */}
        <Page size="A4" style={styles.page}>
          <Image src="/assets/logo.png" style={styles.logo} /> {/* Logo desde public/assets/logo.png */}
          <Text style={styles.subHeader}>Acta semanal de obra - Semana {weekNumber} - Año 2025</Text>
          <View style={styles.detailsTable}>
            <View style={styles.detailsRow} key={`row-1`}>
              <Text style={styles.detailsColLeft}>Promotor: {promoter}</Text>
              <Text style={styles.detailsColRight}>Redactado por: Jesús Moral Abisolo</Text>
            </View>
            <View style={styles.detailsRow} key={`row-2`}>
              <Text style={styles.detailsColLeft}>NIF/NIE: {nifNie}</Text>
              <Text style={styles.detailsColRight}>NIF: 75902042H</Text>
            </View>
            <View style={styles.detailsRow} key={`row-3`}>
              <Text style={styles.detailsColLeft}>Proyecto: {projectId}</Text>
              <Text style={styles.detailsColRight}>Arquitecto técnico y artesano</Text>
            </View>
          </View>
          <Text style={styles.footer}>{startDate}</Text>
        </Page>

        {/* Páginas por parte diario, ordenadas por fecha */}
        {sortedReports.map((report, index) => {
          const project = projects.find((p) => p.id === report.projectId) || {};
          return (
            <Page key={`report-${report.id || index}`} size="A4" style={styles.page}>
              <Text style={styles.title}>Parte del {new Date(report.reportDate).toLocaleDateString()}</Text>
              <Text>Proyecto: {report.projectId}</Text>
              <Text>Cliente: {project.client || "No disponible"}</Text>
              <Text>Dirección: {project.address || "No disponible"}</Text>

              <Text style={styles.title}>Mano de obra</Text>
              <View style={styles.table}>
                <View style={styles.tableRow} key={`header-row-${index}`}>
                  <Text style={styles.tableCol}>Categoría</Text>
                  <Text style={styles.tableCol}>Horas trabajadas</Text>
                  <Text style={styles.tableCol}>Coste por hora</Text>
                  <Text style={styles.tableColLast}>Coste total</Text>
                </View>
                <View style={styles.tableRow} key={`official-row-${index}`}>
                  <Text style={styles.tableCol}>Oficial</Text>
                  <Text style={styles.tableCol}>{formatNumber(report.labor.officialHours)}</Text>
                  <Text style={styles.tableCol}>{formatCurrency(project.officialPrice || 0)}</Text>
                  <Text style={styles.tableColLast}>{formatCurrency(report.labor.officialCost)}</Text>
                </View>
                <View style={styles.tableRow} key={`worker-row-${index}`}>
                  <Text style={styles.tableCol}>Peón</Text>
                  <Text style={styles.tableCol}>{formatNumber(report.labor.workerHours)}</Text>
                  <Text style={styles.tableCol}>{formatCurrency(project.workerPrice || 0)}</Text>
                  <Text style={styles.tableColLast}>{formatCurrency(report.labor.workerCost)}</Text>
                </View>
                <View style={styles.tableRow} key={`total-row-${index}`}>
                  <Text style={styles.tableCol}>Total</Text>
                  <Text style={styles.tableCol}></Text>
                  <Text style={styles.tableCol}></Text>
                  <Text style={styles.tableColLast}>{formatCurrency(report.labor.totalLaborCost)}</Text>
                </View>
              </View>

              <Text style={styles.title}>Materiales</Text>
              {report.materials.map((m, i) => (
                <Text key={`material-${report.id}-${i}`} style={styles.text}>
                  - {m.description}: {formatCurrency(m.cost)},{" "}
                  <Link src={m.invoiceUrl} style={styles.link}>Ver factura/albarán</Link>
                </Text>
              ))}
              <Text>Total Materiales: {formatCurrency(report.totalMaterialsCost)}</Text>

              <Text style={styles.title}>Trabajos realizados</Text>
              <Text>{report.workPerformed.description}</Text>
              {report.workPerformed.photos.map((photo, i) => (
                <View key={`photo-${report.id}-${i}`}>
                  {renderImage(photo)}
                </View>
              ))}

              <Text style={styles.title}>Coste total del parte</Text>
              <Text>{formatCurrency(report.totalCost)}</Text>
            </Page>
          );
        })}
      </Document>
    );
  };

  return (
    <div className="App">
      <h1>Partes de Trabajo</h1>
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setActiveTab("partes")} style={{ marginRight: "10px" }}>
          Partes
        </button>
        <button onClick={() => setActiveTab("informes")}>Informes</button>
      </div>

      {activeTab === "partes" ? (
        <form onSubmit={handleSubmit}>
          <label>ID del Proyecto</label>
          <select onChange={handleProjectChange}>
            <option value="">Selecciona un proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}
              </option>
            ))}
          </select>

          {selectedProject && (
            <>
              <p>Dirección: {selectedProject.address}</p>
              <p>Cliente: {selectedProject.client}</p>
              <p>NIF/NIE: {selectedProject.nifNie}</p>
              <p>Precio oficial: {selectedProject.officialPrice} €/h</p>
              <p>Precio peón: {selectedProject.workerPrice} €/h</p>
            </>
          )}

          <label>Fecha de inicio de la semana</label>
          <input
            type="date"
            value={report.weekStartDate}
            onChange={(e) => setReport({ ...report, weekStartDate: e.target.value })}
            required
          />

          <label>Fecha del parte</label>
          <input
            type="date"
            value={report.reportDate}
            onChange={(e) => setReport({ ...report, reportDate: e.target.value })}
            required
          />

          <h3>Mano de obra</h3>
          <label>Hora entrada oficial</label>
          <input
            type="time"
            value={report.labor.officialEntry}
            onChange={(e) =>
              setReport({ ...report, labor: { ...report.labor, officialEntry: e.target.value } })
            }
          />
          <label>Hora salida oficial</label>
          <input
            type="time"
            value={report.labor.officialExit}
            onChange={(e) =>
              setReport({ ...report, labor: { ...report.labor, officialExit: e.target.value } })
            }
          />
          <label>Hora entrada peón</label>
          <input
            type="time"
            value={report.labor.workerEntry}
            onChange={(e) =>
              setReport({ ...report, labor: { ...report.labor, workerEntry: e.target.value } })
            }
          />
          <label>Hora salida peón</label>
          <input
            type="time"
            value={report.labor.workerExit}
            onChange={(e) =>
              setReport({ ...report, labor: { ...report.labor, workerExit: e.target.value } })
            }
          />

          <h3>Materiales</h3>
          <div>
            <input
              type="text"
              placeholder="Descripción del material"
              value={newMaterial.description}
              onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
            />
            <input
              type="number"
              placeholder="Coste (€)"
              value={newMaterial.cost}
              onChange={(e) => setNewMaterial({ ...newMaterial, cost: e.target.value })}
            />
            <input type="file" accept=".pdf" onChange={handleAddMaterial} />
          </div>
          {report.materials.length > 0 ? (
            report.materials.map((m, index) => (
              <div key={index} style={{ marginTop: "10px", border: "1px solid #ccc", padding: "10px" }}>
                <p>
                  {m.description} - {m.cost} € 
                  (<a href={m.invoiceUrl} target="_blank" rel="noopener noreferrer">Ver PDF</a>)
                </p>
              </div>
            ))
          ) : (
            <p>No hay materiales añadidos aún.</p>
          )}

          <h3>Trabajos realizados</h3>
          <label>Descripción</label>
          <textarea
            value={report.workPerformed.description}
            onChange={(e) =>
              setReport({
                ...report,
                workPerformed: { ...report.workPerformed, description: e.target.value },
              })
            }
          />
          <label>Fotografías</label>
          <input type="file" accept="image/*" onChange={handleAddPhoto} />
          {report.workPerformed.photos.length > 0 ? (
            report.workPerformed.photos.map((photo, index) => (
              <div key={index} style={{ marginTop: "10px" }}>
                <img src={photo} alt={`Trabajo ${index + 1}`} style={{ width: "100px", marginRight: "10px" }} />
              </div>
            ))
          ) : (
            <p>No hay fotos añadidas aún.</p>
          )}

          <button type="submit">Guardar parte</button>
        </form>
      ) : (
        <div>
          <h2>Generar Informe</h2>
          <label>Fecha de inicio:</label>
          <input
            type="date"
            value={reportRange.startDate}
            onChange={(e) => setReportRange({ ...reportRange, startDate: e.target.value })}
          />
          <label>Fecha de fin:</label>
          <input
            type="date"
            value={reportRange.endDate}
            onChange={(e) => setReportRange({ ...reportRange, endDate: e.target.value })}
          />
          <div>
            {filterAndSortReportsByDate().length > 0 ? (
              <PDFDownloadLink
                document={<ReportPDF reports={filterAndSortReportsByDate()} />}
                fileName={`informe_${reportRange.startDate}_${reportRange.endDate}.pdf`}
              >
                {({ loading }) => (loading ? "Generando PDF..." : "Descargar Informe en PDF")}
              </PDFDownloadLink>
            ) : (
              <p>No hay partes en el rango seleccionado.</p>
            )}
          </div>
          <h3>Partes en el rango seleccionado:</h3>
          {filterAndSortReportsByDate().map((report, index) => (
            <div key={report.id || index} style={{ marginTop: "10px", border: "1px solid #ccc", padding: "10px" }}>
              <p>Fecha: {new Date(report.reportDate).toLocaleDateString()}</p>
              <p>Proyecto: {report.projectId}</p>
              <p>Total Coste: {formatCurrency(report.totalCost)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;