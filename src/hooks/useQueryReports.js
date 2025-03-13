// src/hooks/useQueryReports.js
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, storage } from '../firebase';

// Clave de caché para reportes
const REPORTS_CACHE_KEY = 'reports';

// Obtener reportes con filtros y paginación
const fetchReports = async ({ pageParam = null, ...filters }) => {
  const pageSize = filters.pageSize || 10;
  
  let q = collection(db, 'dailyReports');
  const conditions = [];
  
  // Aplicar filtros
  if (filters.projectId) {
    conditions.push(where('projectId', '==', filters.projectId));
  }
  
  if (filters.userId) {
    conditions.push(where('userId', '==', filters.userId));
  }
  
  if (filters.weekNumber) {
    conditions.push(where('weekNumber', '==', filters.weekNumber));
  }
  
  if (filters.startDate) {
    conditions.push(where('reportDate', '>=', filters.startDate));
  }
  
  if (filters.endDate) {
    conditions.push(where('reportDate', '<=', filters.endDate));
  }
  
  // Ordenamiento
  const orderByField = filters.orderBy || 'reportDate';
  const orderDirection = filters.orderDirection || 'desc';
  
  q = query(q, ...conditions, orderBy(orderByField, orderDirection));
  
  // Aplicar paginación
  q = query(q, limit(pageSize));
  
  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }
  
  const querySnapshot = await getDocs(q);
  const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
  const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return {
    items,
    lastDoc,
    hasMore: items.length === pageSize,
  };
};

// Obtener un reporte por ID
const fetchReportById = async (reportId) => {
  if (!reportId) return null;
  
  const docRef = doc(db, 'dailyReports', reportId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  
  return null;
};

// Hook para obtener reportes con paginación infinita
export const useQueryReportsInfinite = (filters = {}) => {
  return useInfiniteQuery({
    queryKey: [REPORTS_CACHE_KEY, filters],
    queryFn: ({ pageParam }) => fetchReports({ pageParam, ...filters }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastDoc : undefined,
  });
};

// Hook para obtener un reporte específico
export const useQueryReport = (reportId) => {
  return useQuery({
    queryKey: [REPORTS_CACHE_KEY, reportId],
    queryFn: () => fetchReportById(reportId),
    enabled: !!reportId, // Solo ejecutar si hay un reportId
  });
};

// Hook para agregar un reporte
export const useAddReport = () => {
  const queryClient = useQueryClient();
  const functions = getFunctions();
  const createReportFunction = httpsCallable(functions, 'createDailyReport');
  
  return useMutation({
    mutationFn: async (reportData) => {
      // Usar Cloud Function para validación y creación
      const result = await createReportFunction(reportData);
      return result.data;
    },
    // Invalidar cache al finalizar
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY] });
    },
  });
};

// Hook para actualizar un reporte
export const useUpdateReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reportId, data }) => {
      const reportRef = doc(db, 'dailyReports', reportId);
      
      // Agregar timestamp de actualización
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(reportRef, updateData);
      return { id: reportId, ...data };
    },
    // Actualizar la caché optimistamente
    onMutate: async ({ reportId, data }) => {
      // Cancelar consultas pendientes
      await queryClient.cancelQueries({ queryKey: [REPORTS_CACHE_KEY, reportId] });
      
      // Guardar el estado previo
      const previousReport = queryClient.getQueryData([REPORTS_CACHE_KEY, reportId]);
      
      // Actualizar la caché optimistamente
      queryClient.setQueryData([REPORTS_CACHE_KEY, reportId], old => ({
        ...old,
        ...data,
      }));
      
      return { previousReport };
    },
    // En caso de error, restaurar el estado previo
    onError: (err, { reportId }, context) => {
      if (context?.previousReport) {
        queryClient.setQueryData([REPORTS_CACHE_KEY, reportId], context.previousReport);
      }
    },
    // Invalidar cache al finalizar
    onSettled: (data, error, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY, reportId] });
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY] });
    },
  });
};

// Hook para eliminar un reporte
export const useDeleteReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reportId) => {
      // Primero obtener el reporte para saber qué archivos eliminar
      const reportRef = doc(db, 'dailyReports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        throw new Error('Reporte no encontrado');
      }
      
      const report = reportSnap.data();
      
      // Función auxiliar para eliminar archivos
      const deleteFileFromStorage = async (url) => {
        if (!url) return;
        try {
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
        } catch (err) {
          console.error(`Error eliminando archivo ${url}:`, err);
        }
      };
      
      // Eliminar facturas de materiales
      if (report.materials?.length > 0) {
        await Promise.all(report.materials.map(m => deleteFileFromStorage(m.invoiceUrl)));
      }
      
      // Eliminar fotos
      if (report.workPerformed?.photos?.length > 0) {
        await Promise.all(report.workPerformed.photos.map(p => deleteFileFromStorage(p.url)));
      }
      
      // Eliminar el documento
      await deleteDoc(reportRef);
      
      return reportId;
    },
    // Actualizar la caché optimistamente
    onMutate: async (reportId) => {
      // Cancelar consultas pendientes
      await queryClient.cancelQueries({ queryKey: [REPORTS_CACHE_KEY] });
      
      // Guardar el estado previo
      const previousCacheData = queryClient.getQueryState([REPORTS_CACHE_KEY]);
      
      // Actualizar todas las páginas de la consulta infinita
      queryClient.setQueriesData(
        { queryKey: [REPORTS_CACHE_KEY] },
        (oldData) => {
          // Solo procesar datos de consultas infinitas
          if (!oldData || !oldData.pages) return oldData;
          
          // Filtrar el reporte eliminado de cada página
          return {
            ...oldData,
            pages: oldData.pages.map(page => ({
              ...page,
              items: page.items.filter(item => item.id !== reportId),
            })),
          };
        }
      );
      
      return { previousCacheData };
    },
    // Invalidar cache al finalizar
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY] });
    },
  });
};