const { onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Inicializar la aplicación
initializeApp();
const db = getFirestore();

// Configuración común para todas las funciones
const functionConfig = {
  region: "us-central1", // Definir región explícitamente
  minInstances: 0,
  maxInstances: 10
};

// Funciones de validación básicas
const isRequired = (value) => value !== undefined && value !== null && value !== '';
const isNumber = (value) => !isNaN(parseFloat(value)) && isFinite(value);
const isPositiveNumber = (value) => isNumber(value) && parseFloat(value) >= 0;
const isValidTime = (value) => !value || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
const isValidDate = (value) => isRequired(value) && !isNaN(Date.parse(value));
const isBoolean = (value) => typeof value === 'boolean';

// Validadores específicos del servidor
const isAuthenticated = (context) => !!context.auth;
const isOwner = async (userId, resourcePath) => {
  try {
    const docSnap = await db.doc(resourcePath).get();
    return docSnap.exists && docSnap.data().userId === userId;
  } catch (error) {
    return false;
  }
};

// Función mejorada para buscar proyecto por ID personalizado
const findProjectById = async (projectId) => {
  console.log(`Buscando proyecto con ID personalizado: '${projectId}'`);
  
  if (!projectId) {
    console.log("ID de proyecto no proporcionado");
    return null;
  }
  
  try {
    // Normalizar el ID para la búsqueda (trim y to string)
    const normalizedId = String(projectId).trim();
    console.log(`ID de proyecto normalizado: '${normalizedId}'`);
    
    // Buscar con consulta case-sensitive
    const projectQuery = await db.collection('projects')
      .where('id', '==', normalizedId)
      .get();
    
    if (projectQuery.empty) {
      console.log(`No se encontró ningún proyecto con ID '${normalizedId}' (búsqueda case-sensitive)`);
      
      // Intentar listar todos los proyectos para diagnóstico
      const allProjects = await db.collection('projects').get();
      console.log(`Total de proyectos en la BD: ${allProjects.size}`);
      console.log("Lista de IDs de proyectos disponibles:");
      allProjects.forEach(doc => {
        const data = doc.data();
        console.log(`- Doc ID: ${doc.id}, Campo id: '${data.id || "NO TIENE CAMPO ID"}'`);
      });
      
      return null;
    }
    
    const projectDoc = projectQuery.docs[0];
    console.log(`Proyecto encontrado con ID: ${projectDoc.id}`);
    return { id: projectDoc.id, ...projectDoc.data() };
  } catch (error) {
    console.error(`Error al buscar proyecto: ${error.message}`);
    return null;
  }
};

// Validadores específicos para trabajos extra
const validateExtraWork = async (data, projectId) => {
  const errors = {};
  
  // Verificar que el proyecto existe y permite trabajos extra
  const project = await findProjectById(projectId);
  
  if (!project) {
    errors.projectId = 'El proyecto no existe';
    return { isValid: false, errors };
  }
  
  if (project.type !== 'fixed' || !project.allowExtraWork) {
    errors.isExtraWork = 'Este proyecto no permite trabajos extra';
    return { isValid: false, errors };
  }
  
  // Validar tipo de trabajo extra
  if (!['additional_budget', 'hourly'].includes(data.extraWorkType)) {
    errors.extraWorkType = 'El tipo de trabajo extra debe ser "additional_budget" o "hourly"';
  }
  
  // Si es presupuesto adicional, validar importe
  if (data.extraWorkType === 'additional_budget') {
    if (!isPositiveNumber(data.extraBudgetAmount)) {
      errors.extraBudgetAmount = 'El importe adicional debe ser un número positivo';
    }
  }
  
  // Si es por horas, validar datos de mano de obra
  if (data.extraWorkType === 'hourly') {
    if (!data.labor) {
      errors.labor = 'Los datos de mano de obra son obligatorios para trabajos extra por horas';
    } else {
      if (!isValidTime(data.labor.officialEntry)) {
        errors['labor.officialEntry'] = 'La hora de entrada del oficial debe tener un formato válido';
      }
      
      if (!isValidTime(data.labor.officialExit)) {
        errors['labor.officialExit'] = 'La hora de salida del oficial debe tener un formato válido';
      }
      
      if (!isValidTime(data.labor.workerEntry)) {
        errors['labor.workerEntry'] = 'La hora de entrada del peón debe tener un formato válido';
      }
      
      if (!isValidTime(data.labor.workerExit)) {
        errors['labor.workerExit'] = 'La hora de salida del peón debe tener un formato válido';
      }
    }
  }
  
  // Validar descripción de trabajo realizado
  if (!data.workPerformed) {
    errors.workPerformed = 'Los datos de trabajo realizado son obligatorios';
  } else if (!isRequired(data.workPerformed.description)) {
    errors['workPerformed.description'] = 'La descripción del trabajo realizado es obligatoria';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Funciones de validación
const validateProject = (data) => {
  const errors = {};
  
  if (!isRequired(data.id)) {
    errors.id = 'El ID es obligatorio';
  } else if (!/^[a-zA-Z0-9-_]+$/.test(data.id)) {
    errors.id = 'El ID solo puede contener letras, números, guiones y guiones bajos';
  }
  
  if (!isRequired(data.client)) errors.client = 'El cliente es obligatorio';
  if (!isRequired(data.address)) errors.address = 'La dirección es obligatoria';
  
  if (!isRequired(data.nifNie)) {
    errors.nifNie = 'El NIF/NIE es obligatorio';
  } else if (!/^[0-9XYZ][0-9]{7}[A-Z]$/.test(data.nifNie)) {
    errors.nifNie = 'El NIF/NIE debe tener un formato válido';
  }
  
  if (!isRequired(data.type)) {
    errors.type = 'El tipo es obligatorio';
  } else if (!['hourly', 'fixed'].includes(data.type)) {
    errors.type = 'El tipo debe ser "hourly" o "fixed"';
  }
  
  if (data.type === 'hourly') {
    if (!isPositiveNumber(data.officialPrice)) {
      errors.officialPrice = 'El precio por hora del oficial debe ser un número positivo';
    }
    
    if (!isPositiveNumber(data.workerPrice)) {
      errors.workerPrice = 'El precio por hora del peón debe ser un número positivo';
    }
  } else if (data.type === 'fixed') {
    if (!isPositiveNumber(data.budgetAmount)) {
      errors.budgetAmount = 'El importe del presupuesto debe ser un número positivo';
    }
    
    // Validar campos para trabajos extra si están habilitados
    if (data.allowExtraWork) {
      // Solo validar precios por hora si se permiten trabajos extra
      if (!isPositiveNumber(data.officialPrice)) {
        errors.officialPrice = 'El precio por hora del oficial para trabajos extra debe ser un número positivo';
      }
      
      if (!isPositiveNumber(data.workerPrice)) {
        errors.workerPrice = 'El precio por hora del peón para trabajos extra debe ser un número positivo';
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateDailyReport = async (data) => {
  const errors = {};
  
  console.log(`Validando parte diario:`, JSON.stringify(data, null, 2));
  
  if (!isValidDate(data.reportDate)) {
    errors.reportDate = 'La fecha debe ser válida';
  }
  
  if (!isRequired(data.projectId)) {
    errors.projectId = 'El ID del proyecto es obligatorio';
  } else {
    // Usar la función mejorada para buscar el proyecto
    const project = await findProjectById(data.projectId);
    
    if (!project) {
      errors.projectId = 'El proyecto no existe';
    } else {
      const projectType = project.type;
      
      // Verificar si es un trabajo extra
      if (data.isExtraWork) {
        // Validar trabajo extra
        const extraWorkValidation = await validateExtraWork(data, data.projectId);
        
        if (!extraWorkValidation.isValid) {
          // Combinar errores
          Object.assign(errors, extraWorkValidation.errors);
        }
      } else {
        // Validaciones específicas según el tipo de proyecto
        if (projectType === 'hourly') {
          // Validar datos de mano de obra si es proyecto por horas
          if (!data.labor) {
            errors.labor = 'Los datos de mano de obra son obligatorios para proyectos por horas';
          } else {
            if (!isValidTime(data.labor.officialEntry)) {
              errors['labor.officialEntry'] = 'La hora de entrada del oficial debe tener un formato válido';
            }
            
            if (!isValidTime(data.labor.officialExit)) {
              errors['labor.officialExit'] = 'La hora de salida del oficial debe tener un formato válido';
            }
            
            if (!isValidTime(data.labor.workerEntry)) {
              errors['labor.workerEntry'] = 'La hora de entrada del peón debe tener un formato válido';
            }
            
            if (!isValidTime(data.labor.workerExit)) {
              errors['labor.workerExit'] = 'La hora de salida del peón debe tener un formato válido';
            }
          }
        } else if (projectType === 'fixed') {
          // Validar importe facturado si es proyecto de presupuesto cerrado
          if (!isPositiveNumber(data.invoicedAmount)) {
            errors.invoicedAmount = 'El importe facturado debe ser un número positivo';
          }
        }
      }
    }
  }
  
  // Validar trabajo realizado
  if (!data.workPerformed) {
    errors.workPerformed = 'Los datos de trabajo realizado son obligatorios';
  } else if (!isRequired(data.workPerformed.description)) {
    errors['workPerformed.description'] = 'La descripción del trabajo realizado es obligatoria';
  }
  
  const result = {
    isValid: Object.keys(errors).length === 0,
    errors
  };
  
  console.log(`Resultado de validación: ${result.isValid ? 'Válido' : 'Inválido'}`);
  if (!result.isValid) {
    console.log(`Errores:`, JSON.stringify(result.errors, null, 2));
  }
  
  return result;
};

// Funciones Cloud con región explícita
exports.createProject = onCall(
  functionConfig, 
  async (request) => {
    const data = request.data;
    const context = request.auth;

    console.log("Datos recibidos:", JSON.stringify(data, null, 2));
    console.log("Contexto de auth:", context ? JSON.stringify(context) : "No autenticado");
    // Verificar autenticación
    if (!context) {
      throw new Error('El usuario debe estar autenticado para crear proyectos');
    }
    
    // Validar datos
    const validationResult = validateProject(data);
    if (!validationResult.isValid) {
      throw new Error(JSON.stringify({
        message: 'Datos de proyecto inválidos',
        details: validationResult.errors
      }));
    }
    
    try {
      // IMPORTANTE: Normalizar el campo id (trim)
      const normalizedId = String(data.id).trim();
      console.log(`ID normalizado: ${normalizedId}`);
      
      // Verificar que no existe un proyecto con el mismo ID personalizado
      const existingProjects = await db.collection('projects')
        .where('id', '==', normalizedId)
        .get();
      
      if (!existingProjects.empty) {
        throw new Error(JSON.stringify({
          message: `Ya existe un proyecto con el ID ${normalizedId}`
        }));
      }
      
      // Agregar ID de usuario y normalizar el ID personalizado
      const projectData = {
        ...data,
        id: normalizedId, // Guardar ID normalizado
        userId: context.uid,
        createdAt: new Date()
      };
      
      // Crear proyecto
      const docRef = await db.collection('projects').add(projectData);
      console.log(`Proyecto creado con ID: ${docRef.id}, ID personalizado: ${normalizedId}`);
      
      return { 
        id: docRef.id,
        success: true,
        message: 'Proyecto creado correctamente'
      };
    } catch (error) {
      // Parsear el mensaje de error si es un JSON
      try {
        const errorData = JSON.parse(error.message);
        throw new Error(errorData.message);
      } catch (parseError) {
        throw new Error(error.message);
      }
    }
  }
);

exports.createDailyReport = onCall(
  functionConfig,
  async (request) => {
    const data = request.data;
    const context = request.auth;
    
    console.log("Recibida solicitud para crear parte diario:", JSON.stringify(data, null, 2));
    
    // Verificar autenticación
    if (!context) {
      throw new Error('El usuario debe estar autenticado para crear partes diarios');
    }
    
    try {
      // Validar datos
      const validationResult = await validateDailyReport(data);
      if (!validationResult.isValid) {
        throw new Error(JSON.stringify({
          message: 'Datos de parte diario inválidos',
          details: validationResult.errors
        }));
      }
      
      // Agregar ID de usuario y timestamp
      const reportData = {
        ...data,
        userId: context.uid,
        createdAt: new Date()
      };
      
      // Crear parte diario
      const docRef = await db.collection('dailyReports').add(reportData);
      console.log(`Parte diario creado correctamente con ID: ${docRef.id}`);
      
      return { 
        id: docRef.id,
        success: true,
        message: 'Parte diario creado correctamente'
      };
    } catch (error) {
      console.error(`Error al crear parte diario:`, error);
      // Parsear el mensaje de error si es un JSON
      try {
        const errorData = JSON.parse(error.message);
        throw new Error(errorData.message);
      } catch (parseError) {
        throw new Error(error.message);
      }
    }
  }
);

// Trigger para validación en tiempo real - también con región específica
exports.validateOnCreate = onDocumentCreated(
  {
    document: '{collection}/{docId}',
    region: 'us-central1' // Especificamos la misma región aquí
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const collection = event.params.collection;
    const data = snapshot.data();
    
    // Solo procesar colecciones específicas
    if (['projects', 'dailyReports'].includes(collection)) {
      let validationResult;
      
      if (collection === 'projects') {
        validationResult = validateProject(data);
      } else if (collection === 'dailyReports') {
        validationResult = await validateDailyReport(data);
      }
      
      // Si hay errores, registrarlos y potencialmente revertir la operación
      if (validationResult && !validationResult.isValid) {
        console.error(`Validation failed for ${collection}/${snapshot.id}:`, validationResult.errors);
        
        // Opcionalmente: Marcar el documento como inválido en lugar de eliminarlo
        await snapshot.ref.update({
          _validationErrors: validationResult.errors,
          _validationStatus: 'invalid'
        });
      }
    }
  }
);