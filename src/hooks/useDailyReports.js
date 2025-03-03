import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, deleteObject } from "firebase/storage";

export const useDailyReports = (dateRange = null) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "dailyReports"), orderBy("reportDate", "desc"));
      const querySnapshot = await getDocs(q);
      const reportsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReports(reportsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const deleteReport = useCallback(async (reportId) => {
    try {
      setLoading(true);
      const reportRef = doc(db, "dailyReports", reportId);
      const reportSnap = await getDoc(reportRef);
      if (!reportSnap.exists()) throw new Error("Reporte no encontrado");
      const report = reportSnap.data();

      const deleteFileFromStorage = async (url) => {
        if (!url) return;
        try {
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
        } catch (err) {
          console.error(`Error eliminando archivo ${url}: ${err.message}`);
        }
      };

      if (report.materials?.length > 0) {
        await Promise.all(report.materials.map((m) => deleteFileFromStorage(m.invoiceUrl)));
      }
      if (report.workPerformed?.photos?.length > 0) {
        await Promise.all(report.workPerformed.photos.map((p) => deleteFileFromStorage(p.url)));
      }

      await deleteDoc(reportRef);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredReports = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) return reports;
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999);

    return reports
      .filter((report) => {
        const reportDate = new Date(report.reportDate);
        return reportDate >= start && reportDate <= end;
      })
      .sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));
  }, [reports, dateRange]);

  return { reports: filteredReports, allReports: reports, loading, error, fetchReports, deleteReport };
};