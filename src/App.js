// src/App.js
import React, { useState, useEffect } from "react"; // Importa useEffect
import DailyReportForm from "./components/DailyReportForm";
import ReportsViewer from "./components/ReportsViewer";
import ProjectsViewer from "./components/ProjectsViewer";
import LoginForm from "./components/LoginForm"; // Importa el componente LoginForm
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from './firebase'; // Importa 'app'
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("partes");
  const [user, setUser] = useState(null); // Estado para el usuario

  const auth = getAuth(app);

  useEffect(() => {
    // Observador del estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Limpieza del observador cuando el componente se desmonta
    return () => unsubscribe();
  }, [auth]);


  return (
    <div className="App">
      <header className="app-header">
        <img src="/assets/logo.png" alt="Logo" className="app-logo" />
      </header>
      <div className="app-container">
        <nav className="tab-buttons">
          <button
            className={activeTab === "partes" ? "active" : ""}
            onClick={() => setActiveTab("partes")}
          >
            Partes
          </button>
          <button
            className={activeTab === "informes" ? "active" : ""}
            onClick={() => setActiveTab("informes")}
          >
            Informes
          </button>
          <button
            className={activeTab === "proyectos" ? "active" : ""}
            onClick={() => setActiveTab("proyectos")}
          >
            Proyectos
          </button>
        </nav>
        <main>
          {user ? ( // Muestra contenido si el usuario está logueado
            <>
              {activeTab === "partes" ? (
                <DailyReportForm />
              ) : activeTab === "informes" ? (
                <ReportsViewer />
              ) : (
                <ProjectsViewer />
              )}
            </>
          ) : (
            <LoginForm /> // Muestra el formulario de login
          )}
        </main>
      </div>
    </div>
  );
}

export default App;