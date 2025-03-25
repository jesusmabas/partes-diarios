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
  
  // MODIFICADO: No sobrescribir el campo 'id' personalizado
  // En lugar de usar { id: doc.id, ...doc.data() }
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Aseguramos que el ID personalizado esté disponible tal cual viene de la BD
    return {
      firestoreId: doc.id, // Guardar el ID de Firestore en una propiedad separada
      ...data // Incluir todos los datos, manteniendo el campo 'id' original
    };
  });
};

// Obtener un proyecto por ID
const fetchProjectById = async (projectId) => {
  if (!projectId) return null;
  
  // MODIFICADO: Intentar buscar primero por ID de Firestore
  try {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        firestoreId: docSnap.id,
        ...data 
      };
    }
  } catch (error) {
    console.error("Error buscando por ID de Firestore:", error);
  }
  
  // Si no se encuentra, intentar buscar por ID personalizado
  try {
    const projectsQuery = query(collection(db, 'projects'), where('id', '==', projectId));
    const querySnapshot = await getDocs(projectsQuery);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      return { 
        firestoreId: docSnap.id,
        ...data 
      };
    }
  } catch (error) {
    console.error("Error buscando por ID personalizado:", error);
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
      // MODIFICADO: Asegurarse de usar el ID correcto de Firestore
      const projectRef = doc(db, 'projects', projectId); // Usar firestoreId si está disponible
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
          project.firestoreId === projectId ? { ...project, ...data } : project
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
      const project = projects.find(p => p.firestoreId === projectId);
      
      if (!project) {
        throw new Error(`Proyecto con ID ${projectId} no encontrado`);
      }
      
      // Eliminar el documento de Firestore
      await deleteDoc(doc(db, 'projects', project.firestoreId));
      
      return projectId;
    },

    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: [PROJECTS_CACHE_KEY] });
      const previousCacheData = queryClient.getQueryState([PROJECTS_CACHE_KEY]);

      queryClient.setQueriesData(
        { queryKey: [PROJECTS_CACHE_KEY] },
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.filter(project => project.firestoreId !== projectId);
        }
      );

      return { previousCacheData };
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] });
    },
  });
};