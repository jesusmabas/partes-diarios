import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { setLogLevel } from "firebase/app"; // Asegúrate de importar setLogLevel

setLogLevel("debug"); // Habilita logs detallados

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
};

let app; // Declara app fuera del try para que sea accesible globalmente

try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase App initialized successfully:", app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  throw error; // Opcional: lanza el error para que otros componentes puedan manejarlo
}

export const db = getFirestore(app);
export const storage = getStorage(app);