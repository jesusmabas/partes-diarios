import React, { useState, useMemo, useCallback } from "react";
import { useQueryProjects } from "../hooks/useQueryProjects";
import { useQueryReportsInfinite } from "../hooks/useQueryReports";
import { useReportFilters } from "../hooks/reports/useReportFilters";
import { useCalculationsService } from "../hooks/useCalculationsService";
import DashboardFilters from "./dashboard/DashboardFilters";
import DashboardSkeleton from "./dashboard/DashboardSkeleton";
import EmptyState from "./common/EmptyState";
import ErrorDisplay from "./common/ErrorDisplay";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from "recharts";
import { formatCurrency, formatNumber } from "../utils/calculationUtils";
import "./Dashboard.css";

const Dashboard = () => {
  const [selectedProject, setSelectedProject] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: new Date().toISOString().split("T")[0]
  });

  const { 
    data: projects = [], 
    isLoading: projectsLoading, 
    error: projectsError 
  } = useQueryProjects();

  const { updateFilters, filters, filterReports } = useReportFilters({
    projectId: selectedProject === "all" ? "" : selectedProject,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  const {
    data,
    isLoading: reportsLoading,
    error: reportsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useQueryReportsInfinite({
    pageSize: 100,
    projectId: filters.projectId,
    startDate: filters.startDate,
    endDate: filters.endDate
  });

  const allReports = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.items || []);
  }, [data]);

  const filteredReports = useMemo(() => {
    return filterReports(allReports);
  }, [allReports, filterReports]);

  const { calculateReportSummary } = useCalculationsService();
  
  const summaryData = useMemo(() => {
    if (!filteredReports.length || !projects.length) {
      return {
        totals: {},
        byProject: [],
        byWeek: []
      };
    }
    
    try {
      return calculateReportSummary(
        filteredReports,
        projects,
        selectedProject === "all" ? "" : selectedProject
      );
    } catch (error) {
      console.error("Error calculando resumen:", error);
      return {
        totals: {},
        byProject: [],
        byWeek: []
      };
    }
  }, [filteredReports, projects, selectedProject, calculateReportSummary]);

  // Calcular métricas adicionales
  const metrics = useMemo(() => {
    const { totals, byWeek, byProject } = summaryData;
    
    // CORRECCIÓN: Los costes son solo materiales
    const totalIncome = totals.totalIncome || 0;
    const totalCost = totals.totalMaterials || 0; // Solo materiales
    const margin = totalIncome - totalCost;
    const marginPercent = totalIncome > 0 ? (margin / totalIncome) * 100 : 0;
    
    // Calcular días trabajados
    const uniqueDates = new Set(filteredReports.map(r => r.reportDate));
    const workDays = uniqueDates.size;
    
    // Promedio diario
    const avgDailyIncome = workDays > 0 ? totalIncome / workDays : 0;
    const avgDailyCost = workDays > 0 ? totalCost / workDays : 0;
    
    // Valor de mano de obra (para eficiencia, no es coste)
    const laborValue = totals.totalLabor || 0;
    
    // Eficiencia (€ por hora)
    const totalHours = (totals.totalOfficialHours || 0) + (totals.totalWorkerHours || 0);
    const efficiency = totalHours > 0 ? totalIncome / totalHours : 0;
    
    // Proyectos con alertas
    const projectsNearBudget = byProject.filter(p => {
      if (p.type !== 'fixed') return false;
      const progress = p.invoicedAmount / p.budgetAmount * 100;
      return progress > 80 && progress < 100;
    });
    
    const projectsOverBudget = byProject.filter(p => {
      if (p.type !== 'fixed') return false;
      return p.invoicedAmount > p.budgetAmount;
    });
    
    return {
      totalIncome,
      totalCost,
      margin,
      marginPercent,
      workDays,
      avgDailyIncome,
      avgDailyCost,
      totalHours,
      efficiency,
      laborValue, // Valor de la mano de obra (para mostrar, no es coste)
      projectsNearBudget,
      projectsOverBudget
    };
  }, [summaryData, filteredReports]);

  // Datos para gráfico de distribución de costes (solo materiales realmente)
  const costDistribution = useMemo(() => {
    const { totals } = summaryData;
    const materials = totals.totalMaterials || 0;
    
    // Si no hay costes de materiales, mostrar mensaje
    if (materials === 0) return [];
    
    return [
      { name: 'Materiales', value: materials, color: '#FF9800' }
    ];
  }, [summaryData]);

  // Datos para gráfico de evolución temporal
  const temporalData = useMemo(() => {
    const { byWeek } = summaryData;
    return byWeek.map(week => ({
      name: week.label,
      ingresos: week.totalIncome || 0,
      materiales: week.materialsCost || 0, // Solo materiales como coste
      margen: (week.totalIncome || 0) - (week.materialsCost || 0)
    }));
  }, [summaryData]);

  // Datos para comparación de proyectos
  const projectComparison = useMemo(() => {
    const { byProject } = summaryData;
    return byProject.slice(0, 5).map(p => ({
      name: p.projectClient || p.projectId,
      ingresos: p.totalIncome || 0,
      materiales: p.materialsCost || 0, // Solo materiales como coste
      margen: (p.totalIncome || 0) - (p.materialsCost || 0)
    }));
  }, [summaryData]);

  const handleFiltersChange = useCallback((newFilters) => {
    if (newFilters.projectId !== undefined) {
      setSelectedProject(newFilters.projectId === "" ? "all" : newFilters.projectId);
    }
    if (newFilters.startDate !== undefined || newFilters.endDate !== undefined) {
      setDateRange(prev => ({
        startDate: newFilters.startDate !== undefined ? newFilters.startDate : prev.startDate,
        endDate: newFilters.endDate !== undefined ? newFilters.endDate : prev.endDate
      }));
    }
    updateFilters(newFilters);
  }, [updateFilters]);

  const isLoading = projectsLoading || reportsLoading;
  const hasError = projectsError || reportsError;

  if (isLoading && !allReports.length) {
    return (
      <div className="dashboard">
        <DashboardSkeleton />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="dashboard">
        <ErrorDisplay
          error={projectsError || reportsError}
          message="Error al cargar los datos del dashboard"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="dashboard">
        <EmptyState
          title="No hay proyectos"
          message="Crea tu primer proyecto para comenzar a ver el dashboard"
        />
      </div>
    );
  }

  if (!filteredReports.length && !isLoading) {
    return (
      <div className="dashboard">
        <DashboardFilters
          projects={projects}
          selectedProject={selectedProject}
          dateRange={dateRange}
          onFiltersChange={handleFiltersChange}
        />
        <EmptyState
          title="No hay partes de trabajo"
          message="No hay partes registrados en el rango de fechas seleccionado"
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard de Proyectos</h2>
        {metrics.workDays > 0 && (
          <div className="dashboard-period-info">
            {metrics.workDays} días trabajados | {filteredReports.length} reportes
          </div>
        )}
      </div>

      <DashboardFilters
        projects={projects}
        selectedProject={selectedProject}
        dateRange={dateRange}
        onFiltersChange={handleFiltersChange}
      />

      {/* Alertas */}
      {(metrics.projectsNearBudget.length > 0 || metrics.projectsOverBudget.length > 0) && (
        <div className="dashboard-alerts">
          {metrics.projectsOverBudget.length > 0 && (
            <div className="alert alert-danger">
              <strong>⚠️ Presupuesto Excedido:</strong> {metrics.projectsOverBudget.length} proyecto(s) han superado el presupuesto
            </div>
          )}
          {metrics.projectsNearBudget.length > 0 && (
            <div className="alert alert-warning">
              <strong>⚡ Cerca del Límite:</strong> {metrics.projectsNearBudget.length} proyecto(s) están al 80%+ del presupuesto
            </div>
          )}
        </div>
      )}

      {/* Métricas Principales */}
      <div className="metrics-grid">
        <div className="metric-card metric-primary">
          <div className="metric-header">
            <span className="metric-icon">💰</span>
            <span className="metric-label">Ingresos Totales</span>
          </div>
          <div className="metric-value">{formatCurrency(metrics.totalIncome)}</div>
          <div className="metric-detail">
            {formatCurrency(metrics.avgDailyIncome)}/día
          </div>
        </div>

        <div className="metric-card metric-info">
          <div className="metric-header">
            <span className="metric-icon">🔧</span>
            <span className="metric-label">Valor Mano Obra</span>
          </div>
          <div className="metric-value">{formatCurrency(metrics.laborValue)}</div>
          <div className="metric-detail">
            {formatNumber(metrics.totalHours)} horas trabajadas
          </div>
        </div>

        <div className="metric-card metric-secondary">
          <div className="metric-header">
            <span className="metric-icon">📦</span>
            <span className="metric-label">Costes Materiales</span>
          </div>
          <div className="metric-value">{formatCurrency(metrics.totalCost)}</div>
          <div className="metric-detail">
            {formatCurrency(metrics.avgDailyCost)}/día
          </div>
        </div>

        <div className={`metric-card ${metrics.margin >= 0 ? 'metric-success' : 'metric-danger'}`}>
          <div className="metric-header">
            <span className="metric-icon">{metrics.margin >= 0 ? '✅' : '❌'}</span>
            <span className="metric-label">Margen Neto</span>
          </div>
          <div className="metric-value">{formatCurrency(metrics.margin)}</div>
          <div className="metric-detail">
            {metrics.marginPercent.toFixed(1)}% de beneficio
          </div>
        </div>
      </div>

      {/* Gráficos en Grid */}
      <div className="charts-grid">
        {/* Evolución Temporal */}
        <div className="chart-card chart-full">
          <h3>Evolución Temporal</h3>
          {temporalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={temporalData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMateriales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF9800" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF9800" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ fontSize: '14px' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="#4CAF50" 
                  fillOpacity={1} 
                  fill="url(#colorIngresos)"
                  name="Ingresos"
                />
                <Area 
                  type="monotone" 
                  dataKey="materiales" 
                  stroke="#FF9800" 
                  fillOpacity={1} 
                  fill="url(#colorMateriales)"
                  name="Materiales"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No hay datos suficientes</div>
          )}
        </div>

        {/* Distribución de Costes */}
        <div className="chart-card">
          <h3>Costes (Materiales)</h3>
          {costDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No hay costes de materiales</div>
          )}
        </div>

        {/* Top Proyectos */}
        <div className="chart-card">
          <h3>Top 5 Proyectos</h3>
          {projectComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '11px' }} />
                <YAxis tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ fontSize: '14px' }}
                />
                <Legend />
                <Bar dataKey="ingresos" fill="#4CAF50" name="Ingresos" />
                <Bar dataKey="materiales" fill="#FF9800" name="Materiales" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No hay datos de proyectos</div>
          )}
        </div>
      </div>

      {/* Tabla Resumen Detallada */}
      <div className="summary-section">
        <h3>Resumen Detallado</h3>
        <div className="summary-cards">
          <div className="summary-stat">
            <span className="stat-label">Mano de Obra</span>
            <span className="stat-value">{formatCurrency(summaryData.totals?.totalLabor || 0)}</span>
            <span className="stat-detail">
              Oficial: {formatNumber(summaryData.totals?.totalOfficialHours || 0)}h | 
              Peón: {formatNumber(summaryData.totals?.totalWorkerHours || 0)}h
            </span>
          </div>
          
          <div className="summary-stat">
            <span className="stat-label">Materiales</span>
            <span className="stat-value">{formatCurrency(summaryData.totals?.totalMaterials || 0)}</span>
          </div>
          
          <div className="summary-stat">
            <span className="stat-label">Facturado</span>
            <span className="stat-value">{formatCurrency(summaryData.totals?.totalInvoiced || 0)}</span>
          </div>
          
          <div className="summary-stat">
            <span className="stat-label">Trabajo Extra</span>
            <span className="stat-value">{formatCurrency(summaryData.totals?.totalExtraBudget || 0)}</span>
            <span className="stat-detail">
              {summaryData.totals?.totalExtraHours || 0} horas extra
            </span>
          </div>
        </div>
      </div>

      {hasNextPage && (
        <div className="load-more-container">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="load-more-button"
          >
            {isFetchingNextPage ? "Cargando..." : "Cargar más datos"}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(Dashboard);