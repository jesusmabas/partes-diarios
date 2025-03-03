import React, { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./App.css";

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [report, setReport] = useState({
    weekStartDate: "",
    reportDate: new Date().toISOString().split("T")[0],
    labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
    materials: [], // Array para materiales
    workPerformed: { description: "", photos: [] },
  });
  const [newMaterial, setNewMaterial] = useState({ description: "", cost: "" }); // Estado para nuevo material

  // Cargar proyectos al iniciar
  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, "projects"));
      const projectsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProjects(projectsData);
    };
    fetchProjects();
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

  // Subir archivo a Storage
  const uploadFile = async (file, folder, fileName) => {
    const storageRef = ref(storage, `${folder}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Añadir material
  const handleAddMaterial = async (e) => {
    const file = e.target.files[0];
    if (file && newMaterial.description && newMaterial.cost) {
      try {
        const url = await uploadFile(file, "invoices", `${selectedProject?.id}_${report.reportDate}_${file.name}`);
        const cost = parseFloat(newMaterial.cost) || 0;
        setReport({
          ...report,
          materials: [...report.materials, { description: newMaterial.description, invoiceUrl: url, cost }],
        });
        setNewMaterial({ description: "", cost: "" }); // Limpiar el formulario
      } catch (error) {
        console.error("Error al subir material:", error);
        alert("Error al subir el material. Revisa la consola para más detalles.");
      }
    } else {
      alert("Por favor, completa la descripción y el coste antes de subir el archivo.");
    }
  };

  // Añadir foto
  const handleAddPhoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await uploadFile(file, "photos", `${selectedProject?.id}_${report.reportDate}_${file.name}`);
      setReport({
        ...report,
        workPerformed: { ...report.workPerformed, photos: [...report.workPerformed.photos, url] },
      });
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

  return (
    <div className="App">
      <h1>Partes de Trabajo</h1>
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
    </div>
  );
}

export default App;