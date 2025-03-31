// functions/index.js

const { onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

initializeApp(); // Assuming already initialized elsewhere or handled by Firebase env
const db = getFirestore();

const functionConfig = {
  region: "us-central1",
  minInstances: 0,
  maxInstances: 10
};

const isRequired = (value) => value !== undefined && value !== null && value !== '';
const isNumber = (value) => !isNaN(parseFloat(value)) && isFinite(value);
const isPositiveNumber = (value) => isNumber(value) && parseFloat(value) >= 0;
const isValidTime = (value) => !value || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
const isValidDate = (value) => isRequired(value) && !isNaN(Date.parse(value));
const isBoolean = (value) => typeof value === 'boolean';

const isAuthenticated = (context) => !!context.auth;
const isOwner = async (userId, resourcePath) => {
  try {
    const docSnap = await db.doc(resourcePath).get();
    return docSnap.exists && docSnap.data().userId === userId;
  } catch (error) {
    return false;
  }
};

const findProjectById = async (projectId) => {
  console.log(`Finding project by custom ID: '${projectId}'`);
  if (!projectId) {
    console.log("Project ID not provided.");
    return null;
  }
  try {
    const normalizedId = String(projectId).trim();
    console.log(`Normalized project ID: '${normalizedId}'`);
    const projectQuery = await db.collection('projects')
      .where('id', '==', normalizedId)
      .limit(1)
      .get();

    if (projectQuery.empty) {
      console.log(`Project with custom ID '${normalizedId}' not found.`);
      return null;
    }

    const projectDoc = projectQuery.docs[0];
    console.log(`Project found. Firestore Doc ID: ${projectDoc.id}`);
    return { firestoreDocId: projectDoc.id, ...projectDoc.data() };
  } catch (error) {
    console.error(`Error finding project '${projectId}': ${error.message}`);
    return null;
  }
};

const validateExtraWork = async (data, projectId) => {
  const errors = {};
  const project = await findProjectById(projectId);
  if (!project) {
    errors.projectId = 'El proyecto no existe';
    return { isValid: false, errors };
  }
  if (project.type !== 'fixed' || !project.allowExtraWork) {
    errors.isExtraWork = 'Este proyecto no permite trabajos extra';
    return { isValid: false, errors };
  }
  if (!['additional_budget', 'hourly'].includes(data.extraWorkType)) {
    errors.extraWorkType = 'Tipo de trabajo extra inválido.';
  }
  if (data.extraWorkType === 'additional_budget') {
    if (!isPositiveNumber(data.extraBudgetAmount)) {
      errors.extraBudgetAmount = 'Importe adicional inválido.';
    }
  }
  if (data.extraWorkType === 'hourly') {
    if (!data.labor) {
      errors.labor = 'Datos de mano de obra obligatorios.';
    } else {
      if (!isValidTime(data.labor.officialEntry)) errors['labor.officialEntry'] = 'Formato HH:MM inválido.';
      if (!isValidTime(data.labor.officialExit)) errors['labor.officialExit'] = 'Formato HH:MM inválido.';
      if (!isValidTime(data.labor.workerEntry)) errors['labor.workerEntry'] = 'Formato HH:MM inválido.';
      if (!isValidTime(data.labor.workerExit)) errors['labor.workerExit'] = 'Formato HH:MM inválido.';
    }
  }
  if (!data.workPerformed || !isRequired(data.workPerformed.description)) {
    errors['workPerformed.description'] = 'Descripción obligatoria.';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};

const validateProject = (data) => {
  const errors = {};
  if (!isRequired(data.id)) errors.id = 'El ID es obligatorio';
  else if (!/^[a-zA-Z0-9 .-]+$/.test(data.id)) errors.id = 'El ID solo puede contener letras, números, espacios, puntos y guiones.';
  if (!isRequired(data.client)) errors.client = 'Cliente obligatorio.';
  if (!isRequired(data.address)) errors.address = 'Dirección obligatoria.';
  if (!isRequired(data.nifNie)) errors.nifNie = 'NIF/NIE obligatorio.';
  else if (!/^[0-9XYZ][0-9]{7}[A-Z]$/.test(data.nifNie)) errors.nifNie = 'NIF/NIE inválido.';
  if (!isRequired(data.type)) errors.type = 'Tipo obligatorio.';
  else if (!['hourly', 'fixed'].includes(data.type)) errors.type = 'Tipo inválido.';
  if (data.type === 'hourly') {
    if (!isPositiveNumber(data.officialPrice)) errors.officialPrice = 'Precio oficial inválido.';
    if (!isPositiveNumber(data.workerPrice)) errors.workerPrice = 'Precio peón inválido.';
  } else if (data.type === 'fixed') {
    if (!isPositiveNumber(data.budgetAmount)) errors.budgetAmount = 'Presupuesto inválido.';
    if (data.allowExtraWork) {
      if (!isPositiveNumber(data.officialPrice)) errors.officialPrice = 'Precio extra oficial inválido.';
      if (!isPositiveNumber(data.workerPrice)) errors.workerPrice = 'Precio extra peón inválido.';
    }
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};

const validateDailyReport = async (data) => {
  const errors = {};
  console.log(`Validating daily report:`, JSON.stringify(data, null, 2));
  if (!isValidDate(data.reportDate)) errors.reportDate = 'Fecha inválida.';
  if (!isRequired(data.projectId)) errors.projectId = 'ID de proyecto obligatorio.';
  else {
    const project = await findProjectById(data.projectId);
    if (!project) errors.projectId = 'El proyecto no existe.';
    else {
      const projectType = project.type;
      if (data.isExtraWork) {
        const extraWorkValidation = await validateExtraWork(data, data.projectId);
        if (!extraWorkValidation.isValid) Object.assign(errors, extraWorkValidation.errors);
      } else {
        if (projectType === 'hourly') {
          if (!data.labor) errors.labor = 'Mano de obra obligatoria.';
          else {
            if (!isValidTime(data.labor.officialEntry)) errors['labor.officialEntry'] = 'Formato HH:MM inválido.';
            if (!isValidTime(data.labor.officialExit)) errors['labor.officialExit'] = 'Formato HH:MM inválido.';
            if (!isValidTime(data.labor.workerEntry)) errors['labor.workerEntry'] = 'Formato HH:MM inválido.';
            if (!isValidTime(data.labor.workerExit)) errors['labor.workerExit'] = 'Formato HH:MM inválido.';
          }
        } else if (projectType === 'fixed') {
          if (!isPositiveNumber(data.invoicedAmount)) errors.invoicedAmount = 'Importe facturado inválido.';
        }
      }
    }
  }
  if (!data.workPerformed || !isRequired(data.workPerformed.description)) {
    errors['workPerformed.description'] = 'Descripción obligatoria.';
  }
  const result = { isValid: Object.keys(errors).length === 0, errors };
  console.log(`Validation result: ${result.isValid ? 'Valid' : 'Invalid'}`, result.errors);
  return result;
};

exports.createProject = onCall(
  functionConfig,
  async (request) => {
    const data = request.data;
    const context = request.auth;
    console.log("Data createProject:", JSON.stringify(data, null, 2));
    if (!context) throw new Error('Authentication required.');
    const validationResult = validateProject(data);
    if (!validationResult.isValid) throw new Error(JSON.stringify({ message: 'Invalid data', details: validationResult.errors }));
    try {
      const normalizedId = String(data.id).trim();
      const existingProjects = await db.collection('projects').where('id', '==', normalizedId).get();
      if (!existingProjects.empty) throw new Error(JSON.stringify({ message: `ID ${normalizedId} already exists` }));
      const projectData = { ...data, id: normalizedId, userId: context.uid, createdAt: new Date() };
      const docRef = await db.collection('projects').add(projectData);
      console.log(`Project created: Doc ID ${docRef.id}, Custom ID ${normalizedId}`);
      return { id: docRef.id, success: true, message: 'Project created.' };
    } catch (error) {
      console.error("Error in createProject:", error);
      try { const errorData = JSON.parse(error.message); throw new Error(errorData.message); }
      catch (parseError) { throw new Error(error.message); }
    }
  }
);

exports.createDailyReport = onCall(
  functionConfig,
  async (request) => {
    const data = request.data;
    const context = request.auth;
    console.log("Data createDailyReport:", JSON.stringify(data, null, 2));
    if (!context) throw new Error('Authentication required.');
    try {
      const validationResult = await validateDailyReport(data);
      if (!validationResult.isValid) throw new Error(JSON.stringify({ message: 'Invalid data', details: validationResult.errors }));
      const reportData = { ...data, userId: context.uid, createdAt: new Date() };
      const docRef = await db.collection('dailyReports').add(reportData);
      console.log(`Daily report created: ${docRef.id}`);
      return { id: docRef.id, success: true, message: 'Daily report created.' };
    } catch (error) {
      console.error("Error in createDailyReport:", error);
      try { const errorData = JSON.parse(error.message); throw new Error(errorData.message); }
      catch (parseError) { throw new Error(error.message); }
    }
  }
);

exports.validateOnCreate = onDocumentCreated(
  { document: '{collection}/{docId}', region: 'us-central1' },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const collection = event.params.collection;
    const data = snapshot.data();
    if (['projects', 'dailyReports'].includes(collection)) {
      let validationResult;
      if (collection === 'projects') validationResult = validateProject(data);
      else if (collection === 'dailyReports') validationResult = await validateDailyReport(data);
      if (validationResult && !validationResult.isValid) {
        console.error(`Validation failed for ${collection}/${snapshot.id}:`, validationResult.errors);
        await snapshot.ref.update({ _validationErrors: validationResult.errors, _validationStatus: 'invalid' });
      }
    }
  }
);

exports.updateProjectInvoicedTotal = onDocumentWritten(
  { document: "dailyReports/{reportId}", region: "us-central1" },
  async (event) => {
    const reportId = event.params.reportId;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    const projectIdBefore = beforeData?.projectId;
    const projectIdAfter = afterData?.projectId;
    const affectedProjectIds = new Set();
    if (projectIdBefore) affectedProjectIds.add(projectIdBefore);
    if (projectIdAfter) affectedProjectIds.add(projectIdAfter);

    if (affectedProjectIds.size === 0) {
      console.log(`Report ${reportId}: No projectId found. Exiting.`);
      return null;
    }

    console.log(`Report ${reportId} changed. Affecting project(s): ${[...affectedProjectIds].join(', ')}`);

    const recalculateAndUpdate = async (projectIdToUpdate) => {
      console.log(`Recalculating for project: ${projectIdToUpdate}`);
      try {
        const project = await findProjectById(projectIdToUpdate);
        if (!project) {
          console.log(`Project ${projectIdToUpdate} not found during recalculation.`);
          return;
        }
        if (project.type !== 'fixed') {
          console.log(`Project ${projectIdToUpdate} is type '${project.type}', skipping update.`);
          return;
        }

        const projectDocumentId = project.firestoreDocId;
        if (!projectDocumentId) {
           console.error(`Firestore document ID missing for project custom ID ${projectIdToUpdate}`);
           return;
        }

        const reportsQuery = db.collection('dailyReports')
          .where('projectId', '==', projectIdToUpdate)
          .where('isExtraWork', '==', false);

        const snapshot = await reportsQuery.get();
        let newTotalInvoiced = 0;
        snapshot.forEach(doc => {
          newTotalInvoiced += parseFloat(doc.data().invoicedAmount) || 0;
        });

        console.log(`Recalculated total for ${projectIdToUpdate} (Doc: ${projectDocumentId}): ${newTotalInvoiced}`);

        const projectRef = db.collection('projects').doc(projectDocumentId);
        await projectRef.update({ totalInvoicedAmount: newTotalInvoiced });

        console.log(`Updated totalInvoicedAmount for project ${projectIdToUpdate} (Doc: ${projectDocumentId}).`);

      } catch (error) {
        console.error(`Error updating totalInvoicedAmount for ${projectIdToUpdate}:`, error);
      }
    };

    for (const pid of affectedProjectIds) {
      await recalculateAndUpdate(pid);
    }

    return null;
  }
);