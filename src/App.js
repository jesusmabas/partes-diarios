// src/App.js (Modificado para integrar el Dashboard)
import React, { useState, useEffect } from "react";
import DailyReportForm from "./components/DailyReportForm";
import ReportsViewer from "./components/reports/ReportsViewer"; // <-- Ruta actualizada
import ProjectsViewer from "./components/ProjectsViewer";
import Dashboard from "./components/Dashboard"; // Importar el nuevo componente
import LoginForm from "./components/LoginForm";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from './firebase';
import "./components/ExtraWork.css"; // Importar archivo CSS de trabajos extra
import "./App.css";
import "./components/ProjectForm.css";  


function App() {
  const [activeTab, setActiveTab] = useState("partes"); // Cambiado a "partes" como tab inicial
  const [user, setUser] = useState(null);

  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
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
  <button
    className={activeTab === "dashboard" ? "active" : ""}
    onClick={() => setActiveTab("dashboard")}
  >
    Dashboard
  </button>
</nav>
        <main>
          {user ? (
            <>
              {activeTab === "dashboard" ? (
                <Dashboard />
              ) : activeTab === "partes" ? (
                <DailyReportForm userId={user.uid} />
              ) : activeTab === "informes" ? (
                <ReportsViewer />
              ) : (
                <ProjectsViewer />
              )}
            </>
          ) : (
            <LoginForm />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;