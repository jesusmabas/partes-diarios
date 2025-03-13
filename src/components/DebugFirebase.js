// src/components/DebugFirebase.js
import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const DebugFirebase = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState('direct'); // 'direct' o 'function'

  // Prueba de la conexión directa a Firestore
  const testDirectFirestore = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // 1. Obtener estado de autenticación
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("No hay usuario autenticado. Inicia sesión primero.");
      }
      
      console.log("Usuario autenticado:", {
        uid: user.uid,
        email: user.email,
        isAnonymous: user.isAnonymous
      });
      
      // 2. Intentar escritura directa
      const docRef = await addDoc(collection(db, "debug_collection"), {
        testField: "Esto es una prueba directa a Firestore",
        timestamp: new Date(),
        userId: user.uid
      });
      
      console.log("Documento escrito con ID:", docRef.id);
      
      // 3. Intentar lectura
      const querySnapshot = await getDocs(collection(db, "debug_collection"));
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      
      setResult({
        writeSuccessful: true,
        documentId: docRef.id,
        readSuccessful: true,
        readResults: docs,
        user: {
          uid: user.uid,
          email: user.email
        }
      });
      
    } catch (err) {
      console.error("Error en prueba directa:", err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };
  
  // Prueba de Cloud Functions
  const testCloudFunction = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // 1. Obtener estado de autenticación
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("No hay usuario autenticado. Inicia sesión primero.");
      }
      
      // 2. Probar Cloud Function createProject
      const functions = getFunctions();
      const createProject = httpsCallable(functions, 'createProject');
      
      const testProject = {
        id: `test-${Date.now()}`,
        client: "Cliente de Prueba",
        address: "Dirección de Prueba",
        nifNie: "12345678Z",
        type: "hourly",
        officialPrice: 20,
        workerPrice: 15
      };
      
      const result = await createProject(testProject);
      
      setResult({
        functionCallSuccessful: true,
        functionResult: result.data,
        user: {
          uid: user.uid,
          email: user.email
        }
      });
      
    } catch (err) {
      console.error("Error en prueba de Cloud Function:", err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };
  
  const handleTest = () => {
    if (testMode === 'direct') {
      testDirectFirestore();
    } else {
      testCloudFunction();
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Depuración de Firebase</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          <input 
            type="radio"
            value="direct"
            checked={testMode === 'direct'}
            onChange={() => setTestMode('direct')}
          /> 
          Prueba directa a Firestore
        </label>
        <label style={{ marginLeft: '20px' }}>
          <input 
            type="radio"
            value="function"
            checked={testMode === 'function'}
            onChange={() => setTestMode('function')}
          /> 
          Prueba de Cloud Function
        </label>
      </div>
      
      <button 
        onClick={handleTest}
        disabled={loading}
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Ejecutando prueba...' : 'Ejecutar prueba'}
      </button>
      
      {error && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: '4px',
          color: '#c62828'
        }}>
          <h3>Error:</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
        </div>
      )}
      
      {result && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e8f5e9',
          border: '1px solid #c8e6c9',
          borderRadius: '4px',
          color: '#2e7d32'
        }}>
          <h3>Resultado:</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default DebugFirebase;