// src/components/dashboard/ProjectCostChart.js
import React, { useState } from "react";
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
import { formatCurrency } from "../../utils/formatters";

const ProjectCostChart = ({ data }) => {
  const [chartType, setChartType] = useState("cost"); // 'cost' o 'breakdown'

  // Si no hay datos, mostrar mensaje
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart-message">
        <p>No hay datos disponibles para mostrar en el gráfico.</p>
      </div>
    );
  }

  // Ordenar proyectos por costo total (descendente)
  const sortedData = [...data].sort((a, b) => b.totalCost - a.totalCost);
  
  // Limitar a los 10 proyectos más costosos para mejor visualización
  const topProjects = sortedData.slice(0, 10);

  // Configurar tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Proyecto: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
          {chartType === "cost" && (
            <p className="tooltip-client">
              {`Cliente: ${data.find((item) => item.id === label)?.client || "Desconocido"}`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-controls">
        <button
          className={chartType === "cost" ? "active" : ""}
          onClick={() => setChartType("cost")}
        >
          Coste Total
        </button>
        <button
          className={chartType === "breakdown" ? "active" : ""}
          onClick={() => setChartType("breakdown")}
        >
          Desglose
        </button>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={topProjects}
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
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {chartType === "cost" ? (
            <Bar
              dataKey="totalCost"
              name="Coste Total"
              fill="#8D432D"
              radius={[4, 4, 0, 0]}
            />
          ) : (
            <>
              <Bar
                dataKey="laborCost"
                name="Mano de Obra"
                stackId="a"
                fill="#8D432D"
              />
              <Bar
                dataKey="materialsCost"
                name="Materiales"
                stackId="a"
                fill="#2C3E50"
              />
              <Bar
                dataKey="invoicedAmount"
                name="Facturado"
                fill="#27AE60"
                radius={[4, 4, 0, 0]}
              />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(ProjectCostChart);