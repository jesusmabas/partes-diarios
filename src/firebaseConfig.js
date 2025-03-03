import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAfW7MtuSnEzanXvniESSIjx5Q_X1_ES-0",
  authDomain: "partesdiarios-bbcc1.firebaseapp.com",
  projectId: "partesdiarios-bbcc1",
  storageBucket: "partesdiarios-bbcc1.firebasestorage.app",
  messagingSenderId: "245661785414",
  appId: "1:245661785414:web:5ec65e0c357a5ccae4d947"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);