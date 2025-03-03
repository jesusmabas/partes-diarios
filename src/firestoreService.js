import { db } from "./firebaseConfig";
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";

// Obtener proyectos
export const obtenerProyectos = async () => {
  const proyectosRef = collection(db, "projects");
  const snapshot = await getDocs(proyectosRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Agregar un nuevo proyecto
export const agregarProyecto = async (proyecto) => {
  const docRef = await addDoc(collection(db, "projects"), proyecto);
  return docRef.id;
};

// Obtener partes diarios ordenados por fecha
export const obtenerPartesDiarios = async () => {
  const q = query(collection(db, "dailyReports"), orderBy("reportDate", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Agregar un parte diario
export const agregarParteDiario = async (parte) => {
  const docRef = await addDoc(collection(db, "dailyReports"), parte);
  return docRef.id;
};
