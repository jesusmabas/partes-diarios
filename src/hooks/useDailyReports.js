// src/hooks/useDailyReports.js - Versión corregida

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  limit, 
  startAfter, 
  getDocs, 
  deleteDoc, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

export const useDailyReports = (initialFilters = {}) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  
  // Estado para paginación
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(50); // Aumentado para cargar más reportes de una vez
  
  // Referencia para cache de reportes por ID
  const reportsCache = useRef(new Map());

  // Función para construir la consulta con filtros
  const buildQuery = useCallback((lastDoc = null) => {
    console.log("Construyendo query con filtros:", filters);
    let q = collection(db, "dailyReports");
    const conditions = [];
    
    // Filtro por fecha de inicio
    if (filters.startDate) {
      conditions.push(where("reportDate", ">=", filters.startDate));
    }
    
    // Filtro por fecha final
    if (filters.endDate) {
      conditions.push(where("reportDate", "<=", filters.endDate));
    }
    
    // Filtro por proyecto
    if (filters.projectId) {
      conditions.push(where("projectId", "==", filters.projectId));
    }
    
    // Filtro por usuario
    if (filters.userId) {
      conditions.push(where("userId", "==", filters.userId));
    }
    
    // Filtro por semana
    if (filters.weekNumber) {
      conditions.push(where("weekNumber", "==", filters.weekNumber));
    }
    
    // Aplicar ordenamiento
    const orderByField = filters.orderBy || "reportDate";
    const orderDirection = filters.orderDirection || "desc";
    
    // Construir la consulta con condiciones
    if (conditions.length > 0) {
      q = query(q, ...conditions, orderBy(orderByField, orderDirection));
    } else {
      q = query(q, orderBy(orderByField, orderDirection));
    }
    
    // Aplicar paginación
    if (pageSize > 0) {
      q = query(q, limit(pageSize));
    }
    
    // Si hay un documento de inicio para paginación
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    return q;
  }, [filters, pageSize]);

  // Función para cargar reportes
  const fetchReports = useCallback(async (resetPagination = true) => {
    console.log("Iniciando fetchReports, resetPagination:", resetPagination);
    setLoading(true);
    setError(null);
    
    try {
      if (resetPagination) {
        setReports([]);
        setLastVisible(null);
      }
      
      const q = buildQuery(resetPagination ? null : lastVisible);
      console.log("Ejecutando consulta a Firestore");
      const querySnapshot = await getDocs(q);
      console.log(`Obtenidos ${querySnapshot.docs.length} documentos de Firestore`);
      
      // Actualizar estado de paginación
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc || null);
      setHasMore(querySnapshot.docs.length === pageSize);
      
      // Procesar resultados
      const reportsData = querySnapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() };
        
        // Actualizar caché
        reportsCache.current.set(doc.id, data);
        
        return data;
      });
      
      // Actualizar lista de reportes (paginación)
      setReports((prev) => {
        const newReports = resetPagination ? reportsData : [...prev, ...reportsData];
        console.log(`Total de reportes cargados: ${newReports.length}`);
        return newReports;
      });
    } catch (err) {
      console.error("Error al cargar reportes:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, lastVisible, pageSize]);

  // Cargar más reportes (paginación)
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      return fetchReports(false);
    }
  }, [fetchReports, hasMore, loading]);

  // Actualizar filtros
  const updateFilters = useCallback((newFilters) => {
    console.log("Actualizando filtros:", newFilters);
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Obtener un reporte por ID (usando caché)
  const getReportById = useCallback(async (reportId) => {
    // Verificar caché primero
    if (reportsCache.current.has(reportId)) {
      return reportsCache.current.get(reportId);
    }
    
    try {
      setLoading(true);
      const reportDoc = await getDoc(doc(db, "dailyReports", reportId));
      
      if (reportDoc.exists()) {
        const reportData = { id: reportDoc.id, ...reportDoc.data() };
        // Actualizar caché
        reportsCache.current.set(reportId, reportData);
        return reportData;
      }
      
      return null;
    } catch (err) {
      console.error(`Error al obtener reporte ${reportId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Eliminar un reporte y sus archivos asociados
  const deleteReport = useCallback(async (reportId) => {
    try {
      console.log("Iniciando eliminación de reporte:", reportId);
      setLoading(true);
      const reportRef = doc(db, "dailyReports", reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        throw new Error("Reporte no encontrado");
      }
      
      const report = reportSnap.data();
      console.log("Datos del reporte a eliminar:", report);

      // Función auxiliar para eliminar archivos de Storage
      const deleteFileFromStorage = async (url) => {
        if (!url) return;
        try {
          // Extraer la ruta de la URL
          const path = decodeURIComponent(url.split('/').slice(3).join('/').split('?')[0]);
          console.log("Intentando eliminar archivo:", path);
          const fileRef = ref(storage, path);
          await deleteObject(fileRef);
          console.log("Archivo eliminado con éxito:", path);
        } catch (err) {
          console.error(`Error eliminando archivo ${url}:`, err);
        }
      };

      // Eliminar facturas de materiales
      if (report.materials?.length > 0) {
        console.log("Eliminando facturas de materiales:", report.materials.length);
        for (const material of report.materials) {
          if (material.invoiceUrl) {
            await deleteFileFromStorage(material.invoiceUrl);
          }
        }
      }
      
      // Eliminar fotos
      if (report.workPerformed?.photos?.length > 0) {
        console.log("Eliminando fotos:", report.workPerformed.photos.length);
        for (const photo of report.workPerformed.photos) {
          if (photo.url) {
            await deleteFileFromStorage(photo.url);
          }
        }
      }

      // Eliminar el documento de Firestore
      console.log("Eliminando documento de Firestore:", reportId);
      await deleteDoc(reportRef);
      
      // Actualizar estado local y caché
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      reportsCache.current.delete(reportId);
      
      console.log("Reporte eliminado con éxito:", reportId);
      return true;
    } catch (err) {
      console.error("Error al eliminar reporte:", err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar reportes al cambiar los filtros
  useEffect(() => {
    console.log("useEffect en useDailyReports - cargando reportes por cambio de filtros");
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Crear objeto para retornar
  const returnObj = {
    reports,
    allReports: reports, // Para compatibilidad con código antiguo
    loading,
    error,
    fetchReports,
    deleteReport,
    getReportById,
    updateFilters,
    filters,
    loadMore,
    hasMore,
    setPageSize
  };

  // Log de depuración
  console.log("useDailyReports retornando:", {
    reportsLength: reports.length,
    loading,
    error
  });

  return returnObj;
};

export default useDailyReports;