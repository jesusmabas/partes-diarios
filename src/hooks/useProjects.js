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

  // Añadimos el try/catch a todas las funciones que interactúan con Firestore
  const addProject = useCallback(async (project) => {
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, "projects"), project);
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
    setError(null);
    try {
      await deleteDoc(doc(db, "projects", projectId));
      await fetchProjects(); // <-  Importante: Refrescar la lista DESPUÉS de eliminar.
    } catch (err) {
      setError(err.message);
      throw err; // Re-lanzar el error.
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);



  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, addProject, updateProject, deleteProject };
};