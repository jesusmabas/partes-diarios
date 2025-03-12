// src/App.js
import React, { useState, useEffect } from "react";
import DailyReportForm from "./components/DailyReportForm";
import ReportsViewer from "./components/ReportsViewer";
import ProjectsViewer from "./components/ProjectsViewer";
import DashboardView from "./components/DashboardView";
import LoginForm from "./components/LoginForm";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from './firebase';
import "./App.css";
import "./components/dashboard/Dashboard.css";

function App() {
  const [activeTab, setActiveTab] = useState("partes");
  const [user, setUser] = useState(null); // Estado para el usuario

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
              {activeTab === "partes" ? (
                <DailyReportForm userId={user.uid} />
              ) : activeTab === "informes" ? (
                <ReportsViewer />
              ) : activeTab === "dashboard" ? (
                <DashboardView />
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