// src/hooks/reports/useReportActions.js (Completo)
import { useCallback, useState } from "react";
import {
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  getDoc,
  getDocs,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";
import { getWeekNumber } from "../../utils/calculationUtils"; // Asegúrate que sea calculationUtils

/**
 * Hook personalizado para gestionar acciones CRUD de reportes
 * @returns {Object} - Objeto con funciones y estados para gestionar reportes
 */
export const useReportActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Función para borrar mensajes de estado
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Función para obtener todos los reportes (con filtro isBilled)
  const fetchReports = useCallback(async (filters = {}) => {
    setLoading(true);
    clearMessages();

    try {
      let reportsQuery = collection(db, "dailyReports");
      const queryFilters = [];

      // Aplicar filtros si se proporcionan
      if (filters.projectId) {
        queryFilters.push(where("projectId", "==", filters.projectId));
      }
      if (filters.userId) {
        queryFilters.push(where("userId", "==", filters.userId));
      }
      if (filters.startDate) {
        queryFilters.push(where("reportDate", ">=", filters.startDate));
      }
      if (filters.endDate) {
        queryFilters.push(where("reportDate", "<=", filters.endDate));
      }
      // NUEVO FILTRO: isBilled
      if (filters.isBilled !== undefined) {
        if (filters.isBilled === false) {
            // Consulta compuesta:  isBilled == false OR isBilled == null
            reportsQuery = query(reportsQuery,
                where("isBilled", "in", [false, null]) // Usar 'in'
            );

        } else {
          queryFilters.push(where("isBilled", "==", filters.isBilled));

      // Construir la consulta con filtros y ordenamiento
      if (queryFilters.length > 0) {
        reportsQuery = query(
          reportsQuery,
          ...queryFilters,
          orderBy("reportDate", "desc")
        );
      } else {
        reportsQuery = query(
          reportsQuery,
          orderBy("reportDate", "desc")
        );
      }

      const querySnapshot = await getDocs(reportsQuery);
      const reportsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSuccess("Reportes obtenidos correctamente");
      return reportsList;
    } catch (err) {
      console.error("Error al obtener reportes:", err);
      setError(`Error al obtener reportes: ${err.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, [clearMessages]);



  // Función para crear un nuevo reporte
  const createReport = useCallback(async (reportData, userId) => {
    if (!reportData || !userId) {
      setError("Datos de reporte o ID de usuario no proporcionados");
      return null;
    }

    setLoading(true);
    clearMessages();

    try {
      // Asegurar que tiene una fecha y calcular semana
      if (!reportData.reportDate) {
        reportData.reportDate = new Date().toISOString().split("T")[0];
      }

      const weekNumber = getWeekNumber(reportData.reportDate);

      // Preparar datos para guardar
      const newReportData = {
        ...reportData,
        weekNumber,
        userId,
        createdAt: new Date(),
        isBilled: false, // NUEVO: isBilled por defecto es false
      };

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, "dailyReports"), newReportData);

      setSuccess("Reporte creado correctamente");
      return { id: docRef.id, ...newReportData };
    } catch (err) {
      console.error("Error al crear reporte:", err);
      setError(`Error al crear reporte: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearMessages]);

  // Función para actualizar un reporte existente
  const updateReport = useCallback(async (reportId, updatedData) => {
    if (!reportId || !updatedData) {
      setError("ID de reporte o datos actualizados no proporcionados");
      return false;
    }

    setLoading(true);
    clearMessages();

    try {
      // Obtener el reporte actual primero
      const reportRef = doc(db, "dailyReports", reportId);
      const reportSnap = await getDoc(reportRef);

      if (!reportSnap.exists()) {
        throw new Error("El reporte no existe");
      }

      // Si hay una fecha nueva, recalcular el número de semana
      if (updatedData.reportDate && updatedData.reportDate !== reportSnap.data().reportDate) {
        updatedData.weekNumber = getWeekNumber(updatedData.reportDate);
      }

      // Actualizar timestamp
      updatedData.updatedAt = new Date();

      // Actualizar en Firestore
      await updateDoc(reportRef, updatedData);

      setSuccess("Reporte actualizado correctamente");
      return true;
    } catch (err) {
      console.error("Error al actualizar reporte:", err);
      setError(`Error al actualizar reporte: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearMessages]);



// Función para eliminar un reporte y sus archivos asociados (sin cambios)
  const deleteReport = useCallback(async (reportId) => {
    if (!reportId) {
      setError("ID de reporte no proporcionado");
      return false;
    }

    setLoading(true);
    clearMessages();

    try {
      // Obtener el reporte primero para saber qué archivos eliminar
      const reportRef = doc(db, "dailyReports", reportId);
      const reportSnap = await getDoc(reportRef);

      if (!reportSnap.exists()) {
        throw new Error("El reporte no existe");
      }

      const reportData = reportSnap.data();

      // Función auxiliar mejorada para eliminar archivos de Storage
      const deleteFileFromStorage = async (url) => {
        if (!url || typeof url !== 'string') return;

        try {
          // Convertir URL a ruta de Storage
          let path;

          // Ejemplo: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?token=TOKEN
          // Necesitamos extraer PATH
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
            // Si es una ruta directa, usarla tal cual
            path = url;
          }

          console.log("Intentando eliminar archivo:", path);
          const fileRef = ref(storage, path);
          await deleteObject(fileRef);
        } catch (err) {
          console.error(`Error al eliminar archivo ${url}:`, err);
          // Continuamos con la eliminación aunque falle un archivo
        }
      };

      // Eliminar facturas de materiales
      if (reportData.materials && Array.isArray(reportData.materials)) {
        for (const material of reportData.materials) {
          if (material && material.invoiceUrl) {
            await deleteFileFromStorage(material.invoiceUrl);
          }
        }
      }

      // Eliminar fotos
      if (reportData.workPerformed && reportData.workPerformed.photos &&
          Array.isArray(reportData.workPerformed.photos)) {
        for (const photo of reportData.workPerformed.photos) {
          if (photo && photo.url) {
            await deleteFileFromStorage(photo.url);
          }
        }
      }

      // Eliminar el documento de Firestore
      await deleteDoc(reportRef);

      setSuccess("Reporte eliminado correctamente");
      return true;
    } catch (err) {
      console.error("Error al eliminar reporte:", err);
      setError(`Error al eliminar reporte: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearMessages]);

  // Obtener un reporte específico por ID (sin cambios)
  const getReportById = useCallback(async (reportId) => {
    if (!reportId) {
      setError("ID de reporte no proporcionado");
      return null;
    }

    setLoading(true);
    clearMessages();

    try {
      const reportRef = doc(db, "dailyReports", reportId);
      const reportSnap = await getDoc(reportRef);

      if (!reportSnap.exists()) {
        throw new Error("El reporte no existe");
      }

      return { id: reportSnap.id, ...reportSnap.data() };
    } catch (err) {
      console.error(`Error al obtener reporte ${reportId}:`, err);
      setError(`Error al obtener reporte: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearMessages]);

  return {
    createReport,
    updateReport,
    deleteReport,
    fetchReports,
    getReportById,
    loading,
    error,
    success,
    clearMessages
  };
};