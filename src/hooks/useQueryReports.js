// src/hooks/useQueryReports.js (Completo)
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

// Obtener reportes con filtros y paginación  (MODIFICADO: Manejo de undefined)
const fetchReports = async ({ pageParam = null, ...filters }) => {
  const pageSize = filters.pageSize || 10;

  let q = collection(db, 'dailyReports');
  const conditions = [];

  // Aplicar filtros
  if (filters.projectId) {
    conditions.push(where("projectId", "==", filters.projectId));
  }
  if (filters.userId) {
    conditions.push(where("userId", "==", filters.userId));
  }
  if (filters.weekNumber) {
    conditions.push(where("weekNumber", "==", filters.weekNumber));
  }
  if (filters.startDate) {
    conditions.push(where("reportDate", ">=", filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(where("reportDate", "<=", filters.endDate));
  }
  // NUEVO FILTRO (Manejo explícito de undefined)
  if (filters.isBilled !== undefined) {  // <-- CAMBIO CRUCIAL AQUÍ
    conditions.push(where("isBilled", "==", filters.isBilled));
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

  const docRef = doc(db, "dailyReports", reportId);
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
    // Invalidar caché al finalizar
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY] });
    },
  });
};

// Hook para actualizar un reporte (MODIFICADO: Optimistic Update)
export const useUpdateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, data }) => {
      const reportRef = doc(db, "dailyReports", reportId);
      const updateData = { ...data, updatedAt: serverTimestamp() }; // Incluye isBilled y cualquier otro dato
      await updateDoc(reportRef, updateData);
      return { id: reportId, ...updateData }; // Devuelve datos actualizados
    },
    // Optimistic Update
    onMutate: async ({ reportId, data }) => {
      await queryClient.cancelQueries({ queryKey: [REPORTS_CACHE_KEY, reportId] });
      const previousReport = queryClient.getQueryData([REPORTS_CACHE_KEY, reportId]);

      queryClient.setQueryData([REPORTS_CACHE_KEY, reportId], old => ({
        ...old,
        ...data, // Aplica los cambios de 'data' (incluyendo isBilled)
      }));

       // Actualiza también la lista de reportes (optimistic update)
        queryClient.setQueryData([REPORTS_CACHE_KEY], (oldData) => {
          if (!oldData || !oldData.pages) return oldData;

          const newPages = oldData.pages.map((page) => {
            return {
              ...page,
              items: page.items.map((item) => {
                if (item.id === reportId) {
                  return { ...item, ...data }; // Aplica cambios al reporte correcto
                }
                return item;
              }),
            };
          });

          return { ...oldData, pages: newPages };
        });

      return { previousReport };
    },
    onError: (err, { reportId }, context) => {
      if (context?.previousReport) {
        queryClient.setQueryData([REPORTS_CACHE_KEY, reportId], context.previousReport);
      }
    },
    onSettled: (data, error, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY, reportId] });
      queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY] });
    },
  });
};

// Hook para eliminar un reporte (sin cambios)
export const useDeleteReport = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (reportId) => {
        const reportRef = doc(db, 'dailyReports', reportId);
        const reportSnap = await getDoc(reportRef);

        if (!reportSnap.exists()) {
          throw new Error('Reporte no encontrado');
        }

        const report = reportSnap.data();

        const deleteFileFromStorage = async (url) => {
            if (!url || typeof url !== 'string') return;
            try {
              let path;
              if (url.includes('firebasestorage.googleapis.com')) {
                const startIndex = url.indexOf('/o/') + 3;
                const endIndex = url.indexOf('?', startIndex);
                if (startIndex > 2 && endIndex > startIndex) {
                  path = decodeURIComponent(url.substring(startIndex, endIndex));
                } else {
                  console.warn("Formato de URL no reconocido:", url);
                  return;
                }
              } else {
                path = url;
              }
              console.log("Intentando eliminar archivo:", path);
              const fileRef = ref(storage, path);
              await deleteObject(fileRef);
            } catch (err) {
              console.error(`Error al eliminar archivo ${url}:`, err);
            }
        };

          if (report.materials && Array.isArray(report.materials)) {
            for (const material of report.materials) {
              if (material && material.invoiceUrl) {
                await deleteFileFromStorage(material.invoiceUrl);
              }
            }
          }

          if (report.workPerformed?.photos && Array.isArray(report.workPerformed.photos)) {
            for (const photo of report.workPerformed.photos) {
              if (photo && photo.url) {
                await deleteFileFromStorage(photo.url);
              }
            }
          }

        await deleteDoc(reportRef);
        return reportId;
      },

        onMutate: async (reportId) => {
          await queryClient.cancelQueries({ queryKey: [REPORTS_CACHE_KEY] });
          const previousCacheData = queryClient.getQueryState([REPORTS_CACHE_KEY]);

            queryClient.setQueriesData(
            { queryKey: [REPORTS_CACHE_KEY] },
            (oldData) => {
              if (!oldData || !oldData.pages) return oldData;
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

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: [REPORTS_CACHE_KEY] });
      },
    });
  };