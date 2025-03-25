import React, { useCallback, useEffect } from "react";
import { useCalculationsService } from "../hooks/useCalculationsService";
import { formatNumber, formatCurrency } from "../utils/calculationUtils";

const LaborForm = ({ labor, onLaborChange, project }) => {
  // Usamos el servicio centralizado de cálculos
  const { calculateLabor } = useCalculationsService();
  const calculatedLabor = calculateLabor(labor, project);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    let newLabor = { ...labor, [name]: value };

    // Si se cambia una hora del oficial, copiar al peón automáticamente
    if (name === "officialEntry") {
      newLabor.workerEntry = value; // Copiar entrada del oficial al peón
    } else if (name === "officialExit") {
      newLabor.workerExit = value; // Copiar salida del oficial al peón
    }

    onLaborChange(newLabor);
  }, [labor, onLaborChange]);

  // Efecto para sincronizar las horas iniciales si ya existen
  useEffect(() => {
    if (labor.officialEntry && !labor.workerEntry) {
      onLaborChange({ ...labor, workerEntry: labor.officialEntry });
    }
    if (labor.officialExit && !labor.workerExit) {
      onLaborChange({ ...labor, workerExit: labor.officialExit });
    }
  }, [labor, onLaborChange]);

  return (
    <div className="labor-form">
      <h3>Mano de obra</h3>
      <div className="labor-row">
        <div className="labor-field">
          <label>Hora entrada oficial</label>
          <input
            type="time"
            name="officialEntry"
            value={labor.officialEntry}
            onChange={handleChange}
            className="time-input"
          />
        </div>
        <div className="labor-field">
          <label>Hora salida oficial</label>
          <input
            type="time"
            name="officialExit"
            value={labor.officialExit}
            onChange={handleChange}
            className="time-input"
          />
        </div>
      </div>
      <div className="labor-row">
        <div className="labor-field">
          <label>Hora entrada peón</label>
          <input
            type="time"
            name="workerEntry"
            value={labor.workerEntry}
            onChange={handleChange}
            className="time-input"
          />
        </div>
        <div className="labor-field">
          <label>Hora salida peón</label>
          <input
            type="time"
            name="workerExit"
            value={labor.workerExit}
            onChange={handleChange}
            className="time-input"
          />
        </div>
      </div>
      {project && (
        <div className="labor-summary">
          <p>
            Oficial: {formatNumber(calculatedLabor.officialHours)} h - {formatCurrency(calculatedLabor.officialCost)}
          </p>
          <p>
            Peón: {formatNumber(calculatedLabor.workerHours)} h - {formatCurrency(calculatedLabor.workerCost)}
          </p>
          <p>
            Total: {formatCurrency(calculatedLabor.totalLaborCost)}
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(LaborForm);