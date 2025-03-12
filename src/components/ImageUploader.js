import React, { useState, useCallback, useRef } from "react";
import { useStorage } from "../hooks/useStorage";
import "./ImageUploader.css"; // Añadiremos los estilos en un archivo separado

const ImageUploader = ({ 
  onImagesUploaded, 
  folder, 
  prefix, 
  maxFiles = 10, 
  acceptedTypes = "image/*",
  existingImages = []
}) => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const fileInputRef = useRef(null);
  
  // eslint-disable-next-line no-unused-vars
  const { uploadFile, uploading, error: uploadError } = useStorage();

  // Prevenir comportamiento por defecto para eventos de arrastrar y soltar
  const preventDefaults = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Procesar los archivos seleccionados
  const handleFiles = useCallback((newFiles) => {
    // Filtrar solo imágenes si es necesario
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    // Verificar límite de archivos
    const totalFiles = files.length + imageFiles.length;
    if (totalFiles > maxFiles) {
      alert(`No puedes subir más de ${maxFiles} imágenes a la vez.`);
      return;
    }
    
    // Actualizar estado de archivos
    setFiles(prevFiles => [...prevFiles, ...imageFiles]);
    
    // Crear vistas previas
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prevPreviews => [
          ...prevPreviews, 
          { id: Date.now() + Math.random(), file, preview: reader.result }
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, [files, maxFiles]);

  // Manejar entrada en la zona de drop
  const handleDragEnter = useCallback((e) => {
    preventDefaults(e);
    setIsDragging(true);
  }, [preventDefaults]);

  // Manejar salida de la zona de drop
  const handleDragLeave = useCallback((e) => {
    preventDefaults(e);
    setIsDragging(false);
  }, [preventDefaults]);

  // Manejar el evento de soltar archivos
  const handleDrop = useCallback((e) => {
    preventDefaults(e);
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [preventDefaults, handleFiles]);

  // Manejar selección de archivos desde el input
  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = null;
  }, [handleFiles]);

  // Eliminar una imagen de la lista
  const handleRemoveFile = useCallback((id) => {
    setPreviews(prevPreviews => prevPreviews.filter(item => item.id !== id));
    // También actualizamos el array de archivos
    setFiles(prevFiles => {
      const previewToRemove = previews.find(p => p.id === id);
      if (previewToRemove) {
        return prevFiles.filter(f => f !== previewToRemove.file);
      }
      return prevFiles;
    });
  }, [previews]);

  // Eliminar una imagen ya subida
  const handleRemoveExistingImage = useCallback((id) => {
    if (onImagesUploaded && typeof onImagesUploaded === 'function') {
      onImagesUploaded({ type: 'remove', id });
    }
  }, [onImagesUploaded]);

  // Subir todas las imágenes
  const handleUploadAll = useCallback(async () => {
    if (files.length === 0) return;
    
    setUploadErrors([]);
    const uploadedImages = [];
    const newProgress = {};
    
    // Subir cada archivo individualmente
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const preview = previews.find(p => p.file === file);
      
      if (!preview) continue;
      
      try {
        newProgress[preview.id] = 0;
        setUploadProgress(prev => ({ ...prev, [preview.id]: 0 }));
        
        // Aquí usamos tu hook de useStorage
        const url = await uploadFile(file, folder, prefix);
        
        if (url) {
          uploadedImages.push({ id: Date.now() + i, url });
          newProgress[preview.id] = 100;
          setUploadProgress(prev => ({ ...prev, [preview.id]: 100 }));
        } else {
          setUploadErrors(prev => [...prev, `Error al subir ${file.name}`]);
          newProgress[preview.id] = -1;
          setUploadProgress(prev => ({ ...prev, [preview.id]: -1 }));
        }
      } catch (error) {
        console.error("Error al subir imagen:", error);
        setUploadErrors(prev => [...prev, `Error al subir ${file.name}: ${error.message}`]);
        newProgress[preview.id] = -1;
        setUploadProgress(prev => ({ ...prev, [preview.id]: -1 }));
      }
    }
    
    // Limpiar después de subir exitosamente
    if (uploadedImages.length > 0) {
      if (onImagesUploaded && typeof onImagesUploaded === 'function') {
        onImagesUploaded({ type: 'add', images: uploadedImages });
      }
      setFiles([]);
      setPreviews([]);
      setUploadProgress({});
    }
  }, [files, previews, uploadFile, folder, prefix, onImagesUploaded]);

  // Abrir el selector de archivos al hacer clic en el área de drop
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="image-uploader">
      {/* Área para arrastrar y soltar */}
      <div 
        className={`drop-area ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          accept={acceptedTypes}
          multiple 
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className="drop-message">
          <i className="upload-icon">📁</i>
          <p>Arrastra imágenes aquí o haz clic para seleccionarlas</p>
          <span className="file-info">Acepta múltiples imágenes (máx. {maxFiles})</span>
        </div>
      </div>
      
      {/* Vista previa de imágenes seleccionadas */}
      {previews.length > 0 && (
        <div className="preview-container">
          <h4>Imágenes seleccionadas ({previews.length})</h4>
          <div className="previews">
            {previews.map((item) => (
              <div key={item.id} className="preview-item">
                <img src={item.preview} alt="Vista previa" />
                <div className="preview-info">
                  <span className="file-name">{item.file.name}</span>
                  <span className="file-size">{(item.file.size / 1024).toFixed(1)} KB</span>
                  {uploadProgress[item.id] !== undefined && (
                    <div className={`upload-progress ${uploadProgress[item.id] === -1 ? 'error' : ''}`}>
                      {uploadProgress[item.id] === -1 ? 
                        'Error' : 
                        `${uploadProgress[item.id]}%`
                      }
                    </div>
                  )}
                </div>
                <button 
                  className="remove-button" 
                  onClick={() => handleRemoveFile(item.id)}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button 
            className="upload-button" 
            onClick={handleUploadAll}
            disabled={uploading || previews.length === 0}
          >
            {uploading ? 'Subiendo...' : 'Subir todas las imágenes'}
          </button>
        </div>
      )}
      
      {/* Mostrar errores */}
      {uploadErrors.length > 0 && (
        <div className="upload-errors">
          <h4>Errores de carga</h4>
          <ul>
            {uploadErrors.map((error, index) => (
              <li key={index} className="error-message">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Imágenes ya subidas */}
      {existingImages && existingImages.length > 0 && (
        <div className="existing-images">
          <h4>Imágenes subidas ({existingImages.length})</h4>
          <div className="previews">
            {existingImages.map((image) => (
              <div key={image.id} className="preview-item">
                <img src={image.url} alt="Imagen subida" />
                <button 
                  className="remove-button" 
                  onClick={() => handleRemoveExistingImage(image.id)}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;