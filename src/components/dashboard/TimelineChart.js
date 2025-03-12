// src/components/dashboard/TimelineChart.js
import React, { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { formatCurrency } from "../../utils/formatters";

const TimelineChart = ({ data }) => {
  const [chartType, setChartType] = useState("line"); // 'line' o 'area'
  const [metricType, setMetricType] = useState("cost"); // 'cost' o 'invoiced'

  // Si no hay datos, mostrar mensaje
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart-message">
        <p>No hay datos disponibles para mostrar en el gráfico.</p>
      </div>
    );
  }

  // Configurar tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-controls">
        <div className="chart-type-buttons">
          <button
            className={chartType === "line" ? "active" : ""}
            onClick={() => setChartType("line")}
          >
            Líneas
          </button>
          <button
            className={chartType === "area" ? "active" : ""}
            onClick={() => setChartType("area")}
          >
            Área
          </button>
        </div>
        <div className="metric-type-buttons">
          <button
            className={metricType === "cost" ? "active" : ""}
            onClick={() => setMetricType("cost")}
          >
            Costes
          </button>
          <button
            className={metricType === "invoiced" ? "active" : ""}
            onClick={() => setMetricType("invoiced")}
          >
            Facturación
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        {chartType === "line" ? (
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekLabel" />
            <YAxis
              tickFormatter={(value) => `€${value}`}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {metricType === "cost" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="totalCost"
                  name="Coste Total"
                  stroke="#8D432D"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="laborCost"
                  name="Mano de Obra"
                  stroke="#2C3E50"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="materialsCost"
                  name="Materiales"
                  stroke="#3498DB"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="invoicedAmount"
                name="Facturado"
                stroke="#27AE60"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        ) : (
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekLabel" />
            <YAxis
              tickFormatter={(value) => `€${value}`}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {metricType === "cost" ? (
              <>
                <Area
                  type="monotone"
                  dataKey="laborCost"
                  name="Mano de Obra"
                  stackId="1"
                  stroke="#2C3E50"
                  fill="#2C3E50"
                />
                <Area
                  type="monotone"
                  dataKey="materialsCost"
                  name="Materiales"
                  stackId="1"
                  stroke="#3498DB"
                  fill="#3498DB"
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="invoicedAmount"
                name="Facturado"
                stroke="#27AE60"
                fill="#27AE60"
              />
            )}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(TimelineChart);