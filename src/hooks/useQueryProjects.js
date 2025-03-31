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

const PROJECTS_CACHE_KEY = 'projects';

const fetchProjects = async (userId = null) => {
  let q = collection(db, 'projects');
  if (userId) {
    q = query(q, where('userId', '==', userId));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    firestoreId: doc.id,
    ...doc.data()
  }));
};

const fetchProjectById = async (projectIdOrFirestoreId) => {
  if (!projectIdOrFirestoreId) return null;

  try {
    const docRef = doc(db, 'projects', projectIdOrFirestoreId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        firestoreId: docSnap.id,
        ...docSnap.data()
      };
    }
  } catch (error) {
     // Ignore error if it's just not found by Firestore ID, we'll try custom ID next
     if (error.code !== 'invalid-argument') { // Don't log if it's just an invalid path format
        console.warn("Attempt to fetch by Firestore ID failed (may try custom ID next):", error);
     }
  }

  try {
    const projectsQuery = query(collection(db, 'projects'), where('id', '==', projectIdOrFirestoreId));
    const querySnapshot = await getDocs(projectsQuery);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return {
        firestoreId: docSnap.id,
        ...docSnap.data()
      };
    }
  } catch (error) {
    console.error("Error fetching project by custom ID:", error);
  }

  return null; // Return null if not found by either ID
};


export const useQueryProjects = (userId = null) => {
  return useQuery({
    queryKey: [PROJECTS_CACHE_KEY, { userId: userId || 'all' }], // Ensure key changes if userId changes
    queryFn: () => fetchProjects(userId),
  });
};


export const useQueryProject = (projectIdOrFirestoreId) => {
    return useQuery({
      // Use a more specific key that includes the ID being queried
      queryKey: [PROJECTS_CACHE_KEY, 'detail', projectIdOrFirestoreId],
      queryFn: () => fetchProjectById(projectIdOrFirestoreId),
      enabled: !!projectIdOrFirestoreId, // Only run if ID is provided
    });
  };


export const useAddProject = () => {
  const queryClient = useQueryClient();
  const functions = getFunctions();
  const createProjectFunction = httpsCallable(functions, 'createProject');

  return useMutation({
    mutationFn: async (projectData) => {
      const result = await createProjectFunction(projectData);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ firestoreId, data }) => {
      if (!firestoreId) {
        throw new Error("firestoreId es requerido para actualizar.");
      }
      const projectRef = doc(db, 'projects', firestoreId);
      const { firestoreId: _, ...updateData } = data;
      await updateDoc(projectRef, updateData);
      return { ...data, firestoreId: firestoreId };
    },
    onMutate: async ({ firestoreId, data }) => {
      if (!firestoreId) return;
      await queryClient.cancelQueries({ queryKey: [PROJECTS_CACHE_KEY, 'detail', firestoreId] }); // Use detailed key
      const previousProject = queryClient.getQueryData([PROJECTS_CACHE_KEY, 'detail', firestoreId]); // Use detailed key

      // Optimistically update the specific project cache
      queryClient.setQueryData([PROJECTS_CACHE_KEY, 'detail', firestoreId], old => ({
          ...(old || {}),
          ...data,
          firestoreId: firestoreId
      }));

      // Optimistically update the list cache
      queryClient.setQueryData([PROJECTS_CACHE_KEY], (oldListData) => {
          if (!oldListData) return [];
          // Ensure we're working with the correct key structure if nested under userId
          // This part might need adjustment based on how useQueryProjects structures its cache
          if (Array.isArray(oldListData)) { // Simple array cache
              return oldListData.map(project =>
                  project.firestoreId === firestoreId ? { ...project, ...data, firestoreId: firestoreId } : project
              );
          } else if (oldListData && typeof oldListData === 'object' && oldListData.pages) { // Infinite query cache
               return {
                   ...oldListData,
                   pages: oldListData.pages.map(page => ({
                       ...page,
                       items: page.items.map(project =>
                           project.firestoreId === firestoreId ? { ...project, ...data, firestoreId: firestoreId } : project
                       )
                   }))
               };
          }
          // Add handling for other cache structures if necessary
          console.warn("Unrecognized cache structure for project list in onMutate");
          return oldListData; // Return unchanged if structure is unknown
      });


      return { previousProject };
    },
    onError: (err, { firestoreId }, context) => {
      if (firestoreId && context?.previousProject) {
        queryClient.setQueryData([PROJECTS_CACHE_KEY, 'detail', firestoreId], context.previousProject); // Use detailed key
      }
      // Consider rolling back the list update as well
       queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] }); // Invalidate list on error for safety
    },
    onSettled: (data, error, { firestoreId }) => {
        if (firestoreId) {
            queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY, 'detail', firestoreId] }); // Use detailed key
        }
        // Always invalidate the main list query (or relevant list queries)
        queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] }); // Invalidate potentially multiple list caches
    },

  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (firestoreId) => { // Expect firestoreId directly
      if (!firestoreId) {
        throw new Error("firestoreId es requerido para eliminar.");
      }
      await deleteDoc(doc(db, 'projects', firestoreId));
      return firestoreId;
    },
    onMutate: async (firestoreId) => {
        if (!firestoreId) return;
        await queryClient.cancelQueries({ queryKey: [PROJECTS_CACHE_KEY] }); // Cancel list queries
        await queryClient.cancelQueries({ queryKey: [PROJECTS_CACHE_KEY, 'detail', firestoreId] }); // Cancel detail query

        const previousDetail = queryClient.getQueryData([PROJECTS_CACHE_KEY, 'detail', firestoreId]);
        queryClient.removeQueries({ queryKey: [PROJECTS_CACHE_KEY, 'detail', firestoreId] }); // Remove detail cache

        const previousListCache = queryClient.getQueryState([PROJECTS_CACHE_KEY]); // Get state to know structure

        // Optimistically remove from the list cache
        queryClient.setQueriesData(
          { queryKey: [PROJECTS_CACHE_KEY] }, // Target list queries
          (oldData) => {
            if (!oldData) return [];
            if (Array.isArray(oldData)) { // Simple array cache
                return oldData.filter(project => project.firestoreId !== firestoreId);
            } else if (oldData && typeof oldData === 'object' && oldData.pages) { // Infinite query cache
                 return {
                     ...oldData,
                     pages: oldData.pages.map(page => ({
                         ...page,
                         items: page.items.filter(project => project.firestoreId !== firestoreId)
                     }))
                 };
            }
            console.warn("Unrecognized cache structure for project list in onMutate (delete)");
            return oldData; // Return unchanged if structure is unknown
          }
        );


        return { previousListCache, previousDetail }; // Return previous states if needed for rollback
    },

    onError: (err, firestoreId, context) => {
        // Rollback logic if needed, using context.previousListCache, context.previousDetail
         console.error("Error deleting project:", err);
         // Invalidate caches to refetch correct state
         if (firestoreId) {
             queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY, 'detail', firestoreId] });
         }
         queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] });
    },

    onSettled: (data, error, firestoreId) => { // data here is the returned firestoreId
      // Invalidate relevant queries to ensure fresh data
      if (firestoreId) {
          queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY, 'detail', firestoreId] });
      }
      queryClient.invalidateQueries({ queryKey: [PROJECTS_CACHE_KEY] }); // Invalidate list(s)
    },
  });
};