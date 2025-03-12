import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null); // Limpiar errores anteriores
    try {
      const querySnapshot = await getDocs(collection(db, "projects"));
      const projectsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProjects(projectsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addProject = useCallback(async (project) => {
    setLoading(true);
    setError(null);
    try {
      // Asegurarse de que el ID no tenga espacios al principio ni al final
      const cleanedProject = {
        ...project,
        id: project.id.trim()
      };
      
      // Verificar si ya existe un proyecto con este ID
      const existingProjects = await getDocs(collection(db, "projects"));
      const exists = existingProjects.docs.some(doc => doc.id === cleanedProject.id);
      
      if (exists) {
        throw new Error(`Ya existe un proyecto con el ID ${cleanedProject.id}`);
      }
      
      // Usar el ID del proyecto como el ID del documento en Firestore
      await addDoc(collection(db, "projects"), cleanedProject);
      await fetchProjects(); // Refrescar la lista
    } catch (err) {
      setError(err.message);
      throw err; // Re-lanzar el error para que se maneje en el componente
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (projectId, updatedProject) => {
    setLoading(true);
    setError(null);
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, updatedProject);
      await fetchProjects(); // Refrescar la lista
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null); // Limpiar errores
    try {
      console.log("deleteProject llamado con projectId:", projectId);
      
      // Verificar todos los proyectos en la base de datos
      const querySnapshot = await getDocs(collection(db, "projects"));
      console.log("Proyectos en la base de datos:");
      querySnapshot.docs.forEach(doc => {
        console.log(`ID del documento: "${doc.id}" - Datos:`, doc.data());
      });
      
      // Buscar el proyecto por su propiedad id dentro de los datos, no por el ID del documento
      const projectDoc = querySnapshot.docs.find(doc => {
        const data = doc.data();
        return data.id === projectId;
      });
      
      if (!projectDoc) {
        throw new Error(`El proyecto con ID ${projectId} no existe.`);
      }
      
      // Usar el ID del documento de Firestore para eliminarlo
      const projectRef = doc(db, "projects", projectDoc.id);
      await deleteDoc(projectRef);
      console.log("deleteDoc completado, llamando a fetchProjects");
      await fetchProjects(); // Refrescar después de eliminar
    } catch (err) {
      console.error("Error en deleteProject:", err);
      setError(err.message);
      throw err; // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, addProject, updateProject, deleteProject };
};