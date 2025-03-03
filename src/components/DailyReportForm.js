 import React, { useState, useCallback } from "react";
 import { addDoc, collection } from "firebase/firestore";
 import { db } from "../firebase";
 import ProjectSelector from "./ProjectSelector";
 import LaborForm from "./LaborForm";
 import MaterialsForm from "./MaterialsForm";
 import WorkPerformedForm from "./WorkPerformedForm";
 import FixedReportForm from "./FixedReportForm";
 import { useLabor } from "../hooks/useLabor";
 import { useProjects } from "../hooks/useProjects";
 import { formatCurrency, getWeekNumber } from "../utils/formatters";

 const DailyReportForm = ({ userId }) => { // <-- RECIBE userId
 const [selectedProject, setSelectedProject] = useState(null);
 const [report, setReport] = useState({
     reportDate: new Date().toISOString().split("T")[0],
     labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
     materials: [],
     workPerformed: { description: "", photos: [], invoicedAmount: 0 }, // Añadido invoicedAmount
 });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [errorMessage, setErrorMessage] = useState("");
 const [successMessage, setSuccessMessage] = useState("");
 const { projects } = useProjects();
 const laborData = useLabor(report.labor, selectedProject);

 const handleDateChange = useCallback((e) => {
     setReport((prev) => ({ ...prev, [e.target.name]: e.target.value }));
 }, []);

 const handleLaborChange = useCallback((newLabor) => {
     setReport((prev) => ({ ...prev, labor: newLabor }));
 }, []);

 const handleMaterialsChange = useCallback((newMaterials) => {
     setReport((prev) => ({ ...prev, materials: newMaterials }));
 }, []);

 const handleWorkPerformedChange = useCallback((newWorkPerformed) => {
     setReport((prev) => ({ ...prev, workPerformed: { ...prev.workPerformed, ...newWorkPerformed } }));
 }, []);

 const handleInvoicedChange = useCallback((e) => {
     const value = parseFloat(e.target.value) || 0;
     setReport((prev) => ({
     ...prev,
     workPerformed: { ...prev.workPerformed, invoicedAmount: value },
     }));
 }, []);
   const handleSubmit = async (e) => {
     e.preventDefault();
     if (!selectedProject || !report.reportDate) {
       setErrorMessage("Por favor, completa todos los campos requeridos.");
       setSuccessMessage("");
       return;
     }

     setIsSubmitting(true);
     setErrorMessage("");
     setSuccessMessage("");

     // Inicializa reportData con valores comunes:
     let reportData = {
       projectId: selectedProject.id,
       weekNumber: getWeekNumber(report.reportDate),
       reportDate: report.reportDate,
       workPerformed: report.workPerformed,
       userId: userId, // Usa el userId que recibiste como prop
     };

     if (selectedProject.type === "hourly") {
       const totalMaterialsCost = report.materials.reduce((sum, m) => sum + (m.cost || 0), 0);
       reportData = {
         ...reportData, // Incluye los datos comunes
         labor: { ...report.labor, ...laborData },
         materials: report.materials,
         totalMaterialsCost,
         totalCost: laborData.totalLaborCost + totalMaterialsCost,
       };
     } else if (selectedProject.type === "fixed") {
         reportData = { //MUY IMPORTANTE, ASIGNAR A REPORTDATA
         ...reportData,
         invoicedAmount: report.workPerformed.invoicedAmount || 0, // Añadido aquí y se guarda en la BD
       };

     }

     try {
       await addDoc(collection(db, "dailyReports"), reportData);
       setSuccessMessage("Parte guardado correctamente!");
       setReport({
         reportDate: new Date().toISOString().split("T")[0],
         labor: { officialEntry: "", officialExit: "", workerEntry: "", workerExit: "" },
         materials: [],
         workPerformed: { description: "", photos: [], invoicedAmount: 0 }, // Resetear invoicedAmount
       });
       setSelectedProject(null);

     } catch (err) {
       setErrorMessage(`Error al guardar: ${err.message}`);
     } finally {
       setIsSubmitting(false);
     }
   };

   const project = projects.find((p) => p.id === selectedProject?.id);

   return (
     <form onSubmit={handleSubmit}>
       {errorMessage && <p className="error-message">{errorMessage}</p>}
       {successMessage && <p className="success-message">{successMessage}</p>}
       <ProjectSelector onProjectSelect={setSelectedProject} selectedProject={selectedProject} />
       {selectedProject && (
         <>
           <div>
             <label>Fecha del parte</label>
             <input
               type="date"
               name="reportDate"
               value={report.reportDate}
               onChange={handleDateChange}
               required
             />
           </div>
           {project.type === "hourly" ? (
             <>
               <LaborForm labor={report.labor} onLaborChange={handleLaborChange} project={selectedProject} />
               <MaterialsForm
                 materials={report.materials}
                 onMaterialsChange={handleMaterialsChange}
                 projectId={selectedProject.id}
                 reportDate={report.reportDate}
               />
             </>
           ) : (
             <FixedReportForm
               workPerformed={report.workPerformed}
               onWorkPerformedChange={handleWorkPerformedChange}
               projectId={selectedProject.id}
               reportDate={report.reportDate}
               onInvoicedChange={handleInvoicedChange}
               invoicedAmount={report.workPerformed.invoicedAmount}
             />
           )}
           <WorkPerformedForm
             workPerformed={report.workPerformed}
             onWorkPerformedChange={handleWorkPerformedChange}
             projectId={selectedProject.id}
             reportDate={report.reportDate}
           />
           <button type="submit" disabled={isSubmitting}>
             {isSubmitting ? "Guardando..." : "Guardar parte"}
           </button>
         </>
       )}
     </form>
   );
 };

 export default DailyReportForm;