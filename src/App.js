// src/App.js (Modificado para integrar el Dashboard)
import React, { useState, useEffect } from "react";
import DailyReportForm from "./components/DailyReportForm";
import ReportsViewer from "./components/ReportsViewer";
import ProjectsViewer from "./components/ProjectsViewer";
import Dashboard from "./components/Dashboard"; // Importar el nuevo componente
import LoginForm from "./components/LoginForm";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from './firebase';
import "./App.css";
import "./components/Dashboard.css"; // Importar los estilos del Dashboard

function App() {
  const [activeTab, setActiveTab] = useState("dashboard"); // Cambiado a "dashboard" como tab inicial
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
          {/* Añadido el botón de Dashboard */}
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
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