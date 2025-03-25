// src/components/ProjectForm.js - Modificación para incluir campos de trabajo extra

import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import useFormValidation from "../hooks/useFormValidation";
import { projectSchema } from "../utils/validationSchemas";
import { formatCurrency } from "../utils/formatters";

const ProjectForm = ({ onProjectAdded }) => {
  const [serverError, setServerError] = useState(null);
  const [serverSuccess, setServerSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Valores iniciales del formulario con campos adicionales
  const initialValues = {
    id: "",
    client: "",
    address: "",
    nifNie: "",
    type: "hourly",
    officialPrice: 0,
    workerPrice: 0,
    budgetAmount: 0,
    allowExtraWork: false  // Nuevo campo para habilitar trabajos extra
  };

  // Usar nuestro hook personalizado para formularios
  const {
    values,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    hasError,
    getError,
    isValid
  } = useFormValidation(initialValues, projectSchema);

  // Función para manejar el envío del formulario
  const submitForm = async (formData) => {
    setIsSubmitting(true);
    setServerError(null);
    setServerSuccess(null);
    
    try {
      // Usar Cloud Functions para validación server-side
      const functions = getFunctions();
      const createProject = httpsCallable(functions, 'createProject');
      
      // Enviar datos para validación y creación
      const result = await createProject(formData);
      
      // Manejar respuesta exitosa
      setServerSuccess(result.data.message || 'Proyecto añadido correctamente');
      resetForm();
      
      // Notificar al componente padre
      if (onProjectAdded && typeof onProjectAdded === 'function') {
        onProjectAdded(result.data);
      }
    } catch (error) {
      // Manejar errores
      console.error("Error al crear proyecto:", error);
      setServerError(error.message || 'Error al crear el proyecto');
      
      // Si hay errores de validación específicos del servidor
      if (error.details && typeof error.details === 'object') {
        // Aquí se podrían mostrar errores específicos por campo
        setServerError(`Error de validación: ${Object.values(error.details).join(', ')}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para manejar el cambio en el checkbox de trabajos extra
  const handleAllowExtraWorkChange = (e) => {
    const { checked } = e.target;
    handleChange({
      target: {
        name: 'allowExtraWork',
        value: checked
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} className="project-form">
      {serverError && <p className="error-message">{serverError}</p>}
      {serverSuccess && <p className="success-message">{serverSuccess}</p>}

      {/* ID del Proyecto */}
      <div className="form-group">
        <label htmlFor="project-id">ID del proyecto</label>
        <input
          id="project-id"
          type="text"
          name="id"
          value={values.id}
          onChange={handleChange}
          onBlur={handleBlur}
          className={hasError('id') ? 'input-error' : ''}
          placeholder="Identificador único del proyecto"
        />
        {hasError('id') && <p className="error-message">{getError('id')}</p>}
      </div>

      {/* Cliente */}
      <div className="form-group">
        <label htmlFor="project-client">Cliente</label>
        <input
          id="project-client"
          type="text"
          name="client"
          value={values.client}
          onChange={handleChange}
          onBlur={handleBlur}
          className={hasError('client') ? 'input-error' : ''}
          placeholder="Nombre del cliente"
        />
        {hasError('client') && <p className="error-message">{getError('client')}</p>}
      </div>

      {/* Dirección */}
      <div className="form-group">
        <label htmlFor="project-address">Dirección</label>
        <input
          id="project-address"
          type="text"
          name="address"
          value={values.address}
          onChange={handleChange}
          onBlur={handleBlur}
          className={hasError('address') ? 'input-error' : ''}
          placeholder="Dirección del proyecto"
        />
        {hasError('address') && <p className="error-message">{getError('address')}</p>}
      </div>

      {/* NIF/NIE */}
      <div className="form-group">
        <label htmlFor="project-nifnie">NIF/NIE</label>
        <input
          id="project-nifnie"
          type="text"
          name="nifNie"
          value={values.nifNie}
          onChange={handleChange}
          onBlur={handleBlur}
          className={hasError('nifNie') ? 'input-error' : ''}
          placeholder="NIF o NIE del cliente"
        />
        {hasError('nifNie') && <p className="error-message">{getError('nifNie')}</p>}
      </div>

      {/* Tipo de Proyecto */}
      <div className="form-group">
        <label htmlFor="project-type">Tipo de proyecto</label>
        <select
          id="project-type"
          name="type"
          value={values.type}
          onChange={handleChange}
          onBlur={handleBlur}
          className={hasError('type') ? 'input-error' : ''}
        >
          <option value="hourly">Por horas</option>
          <option value="fixed">Presupuesto cerrado</option>
        </select>
        {hasError('type') && <p className="error-message">{getError('type')}</p>}
      </div>

      {/* Campos específicos según el tipo */}
      {values.type === "hourly" ? (
        <>
          <div className="form-group">
            <label htmlFor="project-official-price">Precio oficial (€/h)</label>
            <input
              id="project-official-price"
              type="number"
              name="officialPrice"
              value={values.officialPrice}
              onChange={handleChange}
              onBlur={handleBlur}
              className={hasError('officialPrice') ? 'input-error' : ''}
              min="0"
              step="0.01"
              placeholder="Precio por hora del oficial"
            />
            {hasError('officialPrice') && <p className="error-message">{getError('officialPrice')}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="project-worker-price">Precio peón (€/h)</label>
            <input
              id="project-worker-price"
              type="number"
              name="workerPrice"
              value={values.workerPrice}
              onChange={handleChange}
              onBlur={handleBlur}
              className={hasError('workerPrice') ? 'input-error' : ''}
              min="0"
              step="0.01"
              placeholder="Precio por hora del peón"
            />
            {hasError('workerPrice') && <p className="error-message">{getError('workerPrice')}</p>}
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="project-budget">Importe presupuestado (€)</label>
            <input
              id="project-budget"
              type="number"
              name="budgetAmount"
              value={values.budgetAmount}
              onChange={handleChange}
              onBlur={handleBlur}
              className={hasError('budgetAmount') ? 'input-error' : ''}
              min="0"
              step="0.01"
              placeholder="Importe total presupuestado"
            />
            {hasError('budgetAmount') && <p className="error-message">{getError('budgetAmount')}</p>}
          </div>
          
          {/* Opción para habilitar trabajos extra en proyectos de presupuesto cerrado */}
          <div className="form-group checkbox-group">
            <input
              id="project-allow-extra"
              type="checkbox"
              name="allowExtraWork"
              checked={values.allowExtraWork}
              onChange={handleAllowExtraWorkChange}
              className="checkbox-input"
            />
            <label htmlFor="project-allow-extra" className="checkbox-label">
              Permitir trabajos extra fuera de presupuesto
            </label>
          </div>
          
          {/* Si se habilitan trabajos extra, mostrar campos de precios por hora */}
          {values.allowExtraWork && (
            <div className="extra-work-section">
              <h4>Tarifas para trabajos extra por horas</h4>
              <p className="hint-text">Estos precios se aplicarán solo a trabajos extra facturados por horas</p>
              
              <div className="form-group">
                <label htmlFor="project-extra-official-price">Precio oficial para extras (€/h)</label>
                <input
                  id="project-extra-official-price"
                  type="number"
                  name="officialPrice"
                  value={values.officialPrice}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={hasError('officialPrice') ? 'input-error' : ''}
                  min="0"
                  step="0.01"
                  placeholder="Precio por hora del oficial para trabajos extra"
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-extra-worker-price">Precio peón para extras (€/h)</label>
                <input
                  id="project-extra-worker-price"
                  type="number"
                  name="workerPrice"
                  value={values.workerPrice}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={hasError('workerPrice') ? 'input-error' : ''}
                  min="0"
                  step="0.01"
                  placeholder="Precio por hora del peón para trabajos extra"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Botón de envío */}
      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className={!isValid ? 'button-disabled' : ''}
      >
        {isSubmitting ? "Añadiendo..." : "Añadir proyecto"}
      </button>

      {/* Botón para resetear el formulario */}
      <button
        type="button"
        onClick={() => resetForm()}
        disabled={isSubmitting}
        className="button-secondary"
      >
        Limpiar formulario
      </button>
    </form>
  );
};

export default ProjectForm;