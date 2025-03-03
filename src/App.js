import React, { useState } from "react";
import DailyReportForm from "./components/DailyReportForm";
import ReportsViewer from "./components/ReportsViewer";
import ProjectsViewer from "./components/ProjectsViewer"; // Nuevo import
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("partes");

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
          {activeTab === "partes" ? (
            <DailyReportForm />
          ) : activeTab === "informes" ? (
            <ReportsViewer />
          ) : (
            <ProjectsViewer />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;