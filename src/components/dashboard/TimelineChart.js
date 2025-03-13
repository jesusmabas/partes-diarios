// src/components/dashboard/TimelineChart.js
import React, { useState, useCallback } from "react";
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

/**
 * Componente que muestra gráficos de línea temporal para datos de proyectos
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.data - Datos temporales para visualizar
 */
const TimelineChart = ({ data }) => {
  const [chartType, setChartType] = useState("line"); // 'line' o 'area'
  const [metricType, setMetricType] = useState("income"); // Cambiado a 'income' por defecto

  // Manejadores para cambiar tipo de gráfico y métrica
  const handleChartTypeChange = useCallback((type) => {
    setChartType(type);
  }, []);

  const handleMetricTypeChange = useCallback((type) => {
    setMetricType(type);
  }, []);

  // Si no hay datos, mostrar mensaje
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart-message">
        <p>No hay datos disponibles para mostrar en el gráfico.</p>
      </div>
    );
  }

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

  // Determinación del dominio del eje Y para mejor visualización
  const getYAxisDomain = () => {
    if (metricType === "income") {
      const maxIncome = Math.max(...data.map(item => item.totalIncome || 0));
      return [0, maxIncome * 1.1]; // Añadir 10% para mejor visualización
    } else if (metricType === "cost") {
      const maxCost = Math.max(
        ...data.map(item => Math.max(item.totalCost || 0, item.laborCost + item.materialsCost))
      );
      return [0, maxCost * 1.1];
    } else {
      const maxInvoiced = Math.max(...data.map(item => item.invoicedAmount || 0));
      return [0, maxInvoiced * 1.1];
    }
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-controls">
        <div className="chart-type-buttons">
          <button
            className={chartType === "line" ? "active" : ""}
            onClick={() => handleChartTypeChange("line")}
          >
            Líneas
          </button>
          <button
            className={chartType === "area" ? "active" : ""}
            onClick={() => handleChartTypeChange("area")}
          >
            Área
          </button>
        </div>
        <div className="metric-type-buttons">
          <button
            className={metricType === "income" ? "active" : ""}
            onClick={() => handleMetricTypeChange("income")}
          >
            Ingresos
          </button>
          <button
            className={metricType === "cost" ? "active" : ""}
            onClick={() => handleMetricTypeChange("cost")}
          >
            Costes
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
              domain={getYAxisDomain()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {metricType === "income" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="totalIncome"
                  name="Ingresos Totales"
                  stroke="#27AE60"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={true}
                />
              </>
            ) : metricType === "cost" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="totalCost"
                  name="Coste Total"
                  stroke="#8D432D"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={true}
                />
                <Line
                  type="monotone"
                  dataKey="laborCost"
                  name="Mano de Obra"
                  stroke="#2C3E50"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls={true}
                />
                <Line
                  type="monotone"
                  dataKey="materialsCost"
                  name="Materiales"
                  stroke="#3498DB"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls={true}
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
                connectNulls={true}
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
              domain={getYAxisDomain()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {metricType === "income" ? (
              <Area
                type="monotone"
                dataKey="totalIncome"
                name="Ingresos Totales"
                stroke="#27AE60"
                fill="#27AE60"
                connectNulls={true}
              />
            ) : metricType === "cost" ? (
              <>
                <Area
                  type="monotone"
                  dataKey="laborCost"
                  name="Mano de Obra"
                  stackId="1"
                  stroke="#2C3E50"
                  fill="#2C3E50"
                  connectNulls={true}
                />
                <Area
                  type="monotone"
                  dataKey="materialsCost"
                  name="Materiales"
                  stackId="1"
                  stroke="#3498DB"
                  fill="#3498DB"
                  connectNulls={true}
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="invoicedAmount"
                name="Facturado"
                stroke="#27AE60"
                fill="#27AE60"
                connectNulls={true}
              />
            )}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(TimelineChart);