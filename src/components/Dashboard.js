// src/components/Dashboard.js
import React, { useState, useEffect, useMemo } from "react";
import { useDailyReports } from "../hooks/useDailyReports";
import { useProjects } from "../hooks/useProjects";
import { formatCurrency, formatNumber } from "../utils/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";

/**
 * Dashboard optimizado para móviles que muestra métricas y gráficos de proyectos
 */
const Dashboard = () => {
  const { allReports } = useDailyReports();
  const { projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState("");
  const [chartType, setChartType] = useState("costes"); // costes, lineas, area, facturacion
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ 
    startDate: "", 
    endDate: new Date().toISOString().split("T")[0] // Fecha actual como fecha final por defecto
  });

  // Establecer el primer proyecto como seleccionado por defecto cuando se cargan
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]?.id || "");
    }
    if (projects.length > 0 && allReports.length > 0) {
      setLoading(false);
    }
  }, [projects, allReports, selectedProject]);

  // Calcular métricas generales
  const dashboardMetrics = useMemo(() => {
    const totalProjects = projects.length;
    
    let totalReports = 0;
    let totalHours = 0;
    let totalCosts = 0;
    let totalMaterials = 0;
    
    // Filtrar informes por fecha si están establecidas
    let filteredReports = [...allReports];
    
    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
      
      filteredReports = filteredReports.filter(report => {
        const reportDate = new Date(report.reportDate);
        return reportDate >= startDate && reportDate <= endDate;
      });
    }

    filteredReports.forEach(report => {
      totalReports++;
      
      // Sumar horas (solo si existen)
      if (report.labor) {
        totalHours += (report.labor.officialHours || 0) + (report.labor.workerHours || 0);
      }
      
      // Sumar costes
      if (report.totalCost) {
        totalCosts += report.totalCost;
      } else if (report.labor) {
        totalCosts += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
      }
      
      // Sumar materiales
      totalMaterials += report.totalMaterialsCost || 0;
    });

    return {
      totalProjects,
      totalReports,
      totalHours,
      totalCosts,
      totalMaterials
    };
  }, [allReports, projects, dateRange]);

  // Preparar datos para gráficos por proyecto
  const chartData = useMemo(() => {
    if (!selectedProject) return [];

    // Filtrar reportes del proyecto seleccionado y por fecha
    let projectReports = allReports.filter(
      report => report.projectId === selectedProject
    );
    
    // Aplicar filtro de fechas si están definidas
    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
      
      projectReports = projectReports.filter(report => {
        const reportDate = new Date(report.reportDate);
        return reportDate >= startDate && reportDate <= endDate;
      });
    }

    // Agrupar por fecha (semana o mes)
    const grouped = projectReports.reduce((acc, report) => {
      const date = new Date(report.reportDate);
      const weekKey = `Sem ${report.weekNumber}/${date.getFullYear()}`;
      
      if (!acc[weekKey]) {
        acc[weekKey] = {
          period: weekKey,
          costs: 0,
          materials: 0,
          labor: 0,
          invoiced: 0
        };
      }
      
      // Sumar costes para cada categoría
      const reportCost = report.totalCost || 
        ((report.labor?.totalLaborCost || 0) + (report.totalMaterialsCost || 0));
      
      acc[weekKey].costs += reportCost;
      acc[weekKey].materials += report.totalMaterialsCost || 0;
      acc[weekKey].labor += report.labor?.totalLaborCost || 0;
      acc[weekKey].invoiced += report.invoicedAmount || 0;
      
      return acc;
    }, {});

    // Convertir a array y ordenar por fecha
    return Object.values(grouped).sort((a, b) => {
      const aNum = parseInt(a.period.split(' ')[1].split('/')[0]);
      const bNum = parseInt(b.period.split(' ')[1].split('/')[0]);
      return aNum - bNum;
    });
  }, [allReports, selectedProject, dateRange]);

  // Preparar datos para el gráfico de proyectos
  const projectCostData = useMemo(() => {
    // Aplicar filtro de fecha a todos los reportes
    let filteredReports = [...allReports];
    
    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
      
      filteredReports = filteredReports.filter(report => {
        const reportDate = new Date(report.reportDate);
        return reportDate >= startDate && reportDate <= endDate;
      });
    }
    
    return projects.map(project => {
      const projectReports = filteredReports.filter(
        report => report.projectId === project.id
      );
      
      let totalCost = 0;
      projectReports.forEach(report => {
        if (report.totalCost) {
          totalCost += report.totalCost;
        } else if (report.labor) {
          totalCost += (report.labor.totalLaborCost || 0) + (report.totalMaterialsCost || 0);
        } else if (report.invoicedAmount) {
          totalCost += report.invoicedAmount || 0;
        }
      });
      
      return {
        name: project.id,
        value: totalCost
      };
    }).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 proyectos
  }, [allReports, projects, dateRange]);

  const handleProjectChange = (e) => {
    setSelectedProject(e.target.value);
  };
  
  const handleDateRangeChange = (e) => {
    setDateRange((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) {
    return <div className="dashboard-loading">Cargando datos...</div>;
  }

  return (
    <div className="dashboard">
      <h2 className="section-title">Dashboard</h2>
      
      {/* Tarjetas de métricas */}
      <div className="metrics-container">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-value">{dashboardMetrics.totalProjects}</div>
          <div className="metric-label">Proyectos</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">📝</div>
          <div className="metric-value">{dashboardMetrics.totalReports}</div>
          <div className="metric-label">Partes</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-value">{formatNumber(dashboardMetrics.totalHours)}</div>
          <div className="metric-label">Horas</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-value">€{formatNumber(dashboardMetrics.totalCosts)}</div>
          <div className="metric-label">Costes</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">🔧</div>
          <div className="metric-value">€{formatNumber(dashboardMetrics.totalMaterials)}</div>
          <div className="metric-label">Materiales</div>
        </div>
      </div>
      
      {/* Filtros - Proyecto y Fechas */}
      <div className="dashboard-filter">
        <h3>Filtros</h3>
        
        {/* Selector de proyecto */}
        <div className="filter-group">
          <label htmlFor="project-select">Proyecto:</label>
          <select 
            id="project-select"
            value={selectedProject} 
            onChange={handleProjectChange}
            className="project-selector"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.id} - {project.client}
              </option>
            ))}
          </select>
        </div>
        
        {/* Filtro de fechas */}
        <div className="date-range">
          <div className="date-field">
            <label htmlFor="start-date">Fecha inicial:</label>
            <input 
              id="start-date"
              type="date" 
              name="startDate" 
              value={dateRange.startDate} 
              onChange={handleDateRangeChange}
            />
          </div>
          <div className="date-field">
            <label htmlFor="end-date">Fecha final:</label>
            <input 
              id="end-date"
              type="date" 
              name="endDate" 
              value={dateRange.endDate} 
              onChange={handleDateRangeChange}
            />
          </div>
        </div>
      </div>
      
      {/* Gráfico de barras del proyecto seleccionado */}
      <div className="chart-container">
        <div className="chart-tab-buttons">
          <button 
            className={chartType === "costes" ? "active" : ""}
            onClick={() => setChartType("costes")}
          >
            Coste Total
          </button>
          <button 
            className={chartType === "desglose" ? "active" : ""}
            onClick={() => setChartType("desglose")}
          >
            Desglose
          </button>
        </div>
        
        <div className="chart-wrapper">
          {chartType === "costes" && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={projectCostData}
                margin={{ top: 20, right: 10, left: 10, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => `€${value}`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value) => [`€${formatNumber(value)}`, "Coste Total"]}
                  labelFormatter={(value) => `Proyecto: ${value}`}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8D432D" 
                  name="Coste Total" 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {chartType === "desglose" && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => `€${value}`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value) => [`€${formatNumber(value)}`, ""]}
                />
                <Legend />
                <Bar dataKey="labor" name="Mano de Obra" fill="#2c3e50" />
                <Bar dataKey="materials" name="Materiales" fill="#8D432D" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
      {/* Tendencias temporales */}
      <div className="dashboard-section">
        <h3>Tendencias Temporales</h3>
        <div className="chart-tab-buttons">
          <button 
            className={chartType === "lineas" ? "active" : ""}
            onClick={() => setChartType("lineas")}
          >
            Líneas
          </button>
          <button 
            className={chartType === "area" ? "active" : ""}
            onClick={() => setChartType("area")}
          >
            Área
          </button>
          <button 
            className={chartType === "facturacion" ? "active" : ""}
            onClick={() => setChartType("facturacion")}
          >
            Facturación
          </button>
          <button 
            className={chartType === "costes" ? "active" : ""}
            onClick={() => setChartType("costes")}
          >
            Costes
          </button>
        </div>
        
        <div className="chart-wrapper">
          {chartType === "lineas" && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => `€${value}`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value) => [`€${formatNumber(value)}`, ""]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="costs" 
                  name="Costes Totales" 
                  stroke="#8D432D" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="labor" 
                  name="Mano de Obra" 
                  stroke="#2c3e50" 
                />
                <Line 
                  type="monotone" 
                  dataKey="materials" 
                  name="Materiales" 
                  stroke="#7A3624" 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          
          {chartType === "area" && (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => `€${value}`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value) => [`€${formatNumber(value)}`, ""]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="costs" 
                  name="Costes Totales" 
                  stroke="#8D432D" 
                  fill="#8D432D" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          
          {chartType === "facturacion" && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => `€${value}`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value) => [`€${formatNumber(value)}`, ""]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="invoiced" 
                  name="Facturado" 
                  stroke="#27ae60" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
      {/* Resumen de datos */}
      <div className="dashboard-section">
        <h3>Resumen de Datos</h3>
        <table className="data-summary-table">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Mano de Obra</th>
              <th>Materiales</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {chartData.slice(-5).map((item, index) => (
              <tr key={index}>
                <td>{item.period}</td>
                <td>{formatCurrency(item.labor)}</td>
                <td>{formatCurrency(item.materials)}</td>
                <td>{formatCurrency(item.costs)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td>{formatCurrency(chartData.reduce((sum, item) => sum + item.labor, 0))}</td>
              <td>{formatCurrency(chartData.reduce((sum, item) => sum + item.materials, 0))}</td>
              <td>{formatCurrency(chartData.reduce((sum, item) => sum + item.costs, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;