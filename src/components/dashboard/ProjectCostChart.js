// src/components/dashboard/ProjectCostChart.js
import React, { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

/**
 * Componente que muestra gráficos de barras de costes e ingresos por proyecto
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.data - Datos de los proyectos para mostrar
 */
const ProjectCostChart = ({ data }) => {
  const [chartType, setChartType] = useState("income"); // Cambiado por defecto a "income"

  // Manejador para cambiar el tipo de gráfico
  const handleChartTypeChange = useCallback((type) => {
    setChartType(type);
  }, []);

  // Si no hay datos, mostrar mensaje
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart-message">
        <p>No hay datos disponibles para mostrar en el gráfico.</p>
      </div>
    );
  }

  // Ordenar proyectos por ingresos totales o coste total según vista
  const sortedData = [...data]
    .sort((a, b) => {
      if (chartType === "income") {
        return b.totalIncome - a.totalIncome;
      } else if (chartType === "cost") {
        return b.totalCost - a.totalCost;
      } else { // breakdown
        const aTotal = Math.max(
          a.laborCost + a.materialsCost,
          a.invoicedAmount || 0
        );
        const bTotal = Math.max(
          b.laborCost + b.materialsCost,
          b.invoicedAmount || 0
        );
        return bTotal - aTotal;
      }
    })
    .slice(0, 10); // Limitar a los 10 proyectos más importantes

  // Función para formatear valores de moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Configurar tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Encontrar el proyecto correspondiente
      const project = data.find((item) => item.id === label);
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Proyecto: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
          {project && (
            <>
              <p className="tooltip-client">
                {`Cliente: ${project.client || "Desconocido"}`}
              </p>
              <p className="tooltip-type">
                {`Tipo: ${project.type === 'hourly' ? 'Por horas' : 'Presupuesto cerrado'}`}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Ajuste para visualización correcta de datos con valores pequeños
  const getYAxisDomain = () => {
    if (chartType === "income") {
      const maxValue = Math.max(...sortedData.map(item => item.totalIncome || 0));
      return [0, maxValue * 1.1]; // 10% más para mejor visualización
    } else if (chartType === "cost") {
      const maxValue = Math.max(...sortedData.map(item => item.totalCost || 0));
      return [0, maxValue * 1.1];
    } else {
      const maxValues = sortedData.map(item => {
        return Math.max(
          item.laborCost + item.materialsCost, 
          item.invoicedAmount || 0
        );
      });
      const maxValue = Math.max(...maxValues);
      return [0, maxValue * 1.1];
    }
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-controls">
        <button
          className={chartType === "income" ? "active" : ""}
          onClick={() => handleChartTypeChange("income")}
        >
          Ingresos Totales
        </button>
        <button
          className={chartType === "cost" ? "active" : ""}
          onClick={() => handleChartTypeChange("cost")}
        >
          Coste Total
        </button>
        <button
          className={chartType === "breakdown" ? "active" : ""}
          onClick={() => handleChartTypeChange("breakdown")}
        >
          Desglose
        </button>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={sortedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="id"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis
            tickFormatter={(value) => `€${value}`}
            width={70}
            domain={getYAxisDomain()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {chartType === "income" ? (
            <Bar
              dataKey="totalIncome"
              name="Ingresos Totales"
              fill="#27AE60"
              radius={[4, 4, 0, 0]}
              minPointSize={3}
            />
          ) : chartType === "cost" ? (
            <Bar
              dataKey="totalCost"
              name="Coste Total"
              fill="#8D432D"
              radius={[4, 4, 0, 0]}
              minPointSize={3}
            />
          ) : (
            <>
              {/* Para proyectos por horas mostramos mano de obra y materiales */}
              <Bar
                dataKey="laborCost"
                name="Mano de Obra"
                stackId="a"
                fill="#8D432D"
                minPointSize={3}
              />
              <Bar
                dataKey="materialsCost"
                name="Materiales"
                stackId="a"
                fill="#2C3E50"
                minPointSize={3}
              />
              {/* Bar separada para invoicedAmount (proyectos de presupuesto cerrado) */}
              <Bar
                dataKey="invoicedAmount"
                name="Facturado"
                fill="#27AE60"
                radius={[4, 4, 0, 0]}
                minPointSize={3}
              />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(ProjectCostChart);