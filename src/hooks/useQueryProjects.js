// src/hooks/useQueryProjects.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';

// Clave de caché para proyectos
const PROJECTS_CACHE_KEY = 'projects';

// Obtener todos los proyectos
const fetchProjects = async (userId = null) => {
  let q = collection(db, 'projects');
  
  if (userId) {
    q = query(q, where('userId', '==', userId));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Obtener un proyecto por ID
const fetchProjectById = async (projectId) => {
  if (!projectId) return null;
  
  const docRef = doc(db, 'projects', projectId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  
  return null;
};

// Hook para obtener proyectos
export const useQueryProjects = (userId = null) => {
  return useQuery({
    queryKey: [PROJECTS_CACHE_KEY, { userId }],
    queryFn: () => fetchProjects(userId),
  });
};

// Hook para obtener un proyecto específico
export const useQueryProject = (projectId) => {
  return useQuery({
    queryKey: [PROJECTS_CACHE_KEY, projectId],
    queryFn: () => fetchProjectById(projectId),
    enabled: !!projectId, // Solo ejecutar si hay un projectId
  });
};

// Hook para agregar un proyecto
export const useAddProject = () => {
  const queryClient = useQueryClient();
  const functions = getFunctions();
  const createProjectFunction = httpsCallable(functions, 'createProject');
  
  return useMutation({
    mutationFn: async (projectData) => {
      // Usar Cloud Function para validación y creación
      const result = await createProjectFunction(projectData);
      return result.data;
    },
    // Invalidar cache al finalizar
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] });
    },
  });
};

// Hook para actualizar un proyecto
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, data);
      return { id: projectId, ...data };
    },
    // Actualizar la caché optimistamente
    onMutate: async ({ projectId, data }) => {
      // Cancelar consultas pendientes
      await queryClient.cancelQueries({ queryKey: [PROJECTS_CACHE_KEY, projectId] });
      
      // Guardar el estado previo
      const previousProject = queryClient.getQueryData([PROJECTS_CACHE_KEY, projectId]);
      
      // Actualizar la caché optimistamente
      queryClient.setQueryData([PROJECTS_CACHE_KEY, projectId], old => ({
        ...old,
        ...data,
      }));
      
      // También actualizar la lista de proyectos
      queryClient.setQueryData([PROJECTS_CACHE_KEY], old => {
        if (!old) return old;
        return old.map(project => 
          project.id === projectId ? { ...project, ...data } : project
        );
      });
      
      return { previousProject };
    },
    // En caso de error, restaurar el estado previo
    onError: (err, { projectId }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData([PROJECTS_CACHE_KEY, projectId], context.previousProject);
      }
    },
    // Invalidar cache al finalizar
    onSettled: (data, error, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] });
    },
  });
};

// Hook para eliminar un proyecto
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectId) => {
      // Buscar el proyecto por ID dentro de los datos
      const projects = await fetchProjects();
      const project = projects.find(p => p.id === projectId);
      
      if (!project) {
        throw new Error(`Proyecto con ID ${projectId} no encontrado`);
      }
      
      // Eliminar el documento de Firestore
      const projectDoc = projects.find(p => p.id === projectId);
      await deleteDoc(doc(db, 'projects', projectDoc.id));
      
      return projectId;
    },
    // Actualizar la caché optimistamente
    onMutate: async (projectId) => {
      // Cancelar consultas pendientes
      await queryClient.cancelQueries({ queryKey: [PROJECTS_CACHE_KEY] });
      
      // Guardar el estado previo
      const previousProjects = queryClient.getQueryData([PROJECTS_CACHE_KEY]);
      
      // Actualizar la caché optimistamente
      queryClient.setQueryData([PROJECTS_CACHE_KEY], old => {
        if (!old) return [];
        return old.filter(project => project.id !== projectId);
      });
      
      return { previousProjects };
    },
    // En caso de error, restaurar el estado previo
    onError: (err, projectId, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData([PROJECTS_CACHE_KEY], context.previousProjects);
      }
    },
    // Invalidar cache al finalizar
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] });
    },
  });
};