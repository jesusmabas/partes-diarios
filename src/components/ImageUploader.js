import React, { useState, useCallback, useRef } from "react";
import { useStorage } from "../hooks/useStorage";
import "./ImageUploader.css";

const ImageUploader = ({
  onImagesUploaded,
  folder = "photos",
  prefix = "image",
  maxFiles = 5,
  existingImages = []
}) => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const { uploadFile, uploading, error: uploadError } = useStorage();

  // Prevenir comportamiento por defecto del navegador
  const preventDefaults = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Validar archivo individual
  const validateFile = useCallback((file) => {
    const errors = [];
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      errors.push(`"${file.name}" no es una imagen válida`);
      return errors;
    }

    // Validar tamaño (5MB para imágenes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`"${file.name}" es muy grande (máx 5MB)`);
      return errors;
    }

    // Validar formatos específicos
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      errors.push(`"${file.name}" tiene un formato no soportado. Usa JPG, PNG, GIF o WebP`);
    }

    return errors;
  }, []);

  // Manejar nuevos archivos
  const handleFiles = useCallback((newFiles) => {
    // Filtrar solo imágenes
    const imageFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setUploadErrors(['No se seleccionaron imágenes válidas']);
      return;
    }

    // Validar límite de archivos
    const totalFiles = files.length + imageFiles.length;
    if (totalFiles > maxFiles) {
      alert(`No puedes subir más de ${maxFiles} imágenes a la vez. Tienes ${files.length} y estás intentando añadir ${imageFiles.length}.`);
      return;
    }

    // Validar cada archivo
    const validationErrors = [];
    imageFiles.forEach(file => {
      const errors = validateFile(file);
      if (errors.length > 0) {
        validationErrors.push(...errors);
      }
    });

    if (validationErrors.length > 0) {
      setUploadErrors(validationErrors);
      return;
    }

    // Limpiar errores previos
    setUploadErrors([]);

    // Agregar archivos validados
    setFiles(prevFiles => [...prevFiles, ...imageFiles]);

    // Crear previsualizaciones
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prevPreviews => [
          ...prevPreviews,
          { 
            id: Date.now() + Math.random(), 
            file, 
            preview: reader.result,
            status: 'pending' // pending, uploading, success, error
          }
        ]);
      };
      reader.onerror = () => {
        setUploadErrors(prev => [...prev, `Error al leer "${file.name}"`]);
      };
      reader.readAsDataURL(file);
    });
  }, [files.length, maxFiles, validateFile]);

  // Eventos de drag & drop
  const handleDragEnter = useCallback((e) => {
    preventDefaults(e);
    setIsDragging(true);
  }, [preventDefaults]);

  const handleDragLeave = useCallback((e) => {
    preventDefaults(e);
    setIsDragging(false);
  }, [preventDefaults]);

  const handleDrop = useCallback((e) => {
    preventDefaults(e);
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [preventDefaults, handleFiles]);

  // Selección de archivos desde input
  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  // Remover archivo antes de subir
  const handleRemoveFile = useCallback((id) => {
    setPreviews(prevPreviews => prevPreviews.filter(item => item.id !== id));
    setFiles(prevFiles => {
      const previewToRemove = previews.find(p => p.id === id);
      if (!previewToRemove) return prevFiles;
      return prevFiles.filter(f => f !== previewToRemove.file);
    });
    // Limpiar progreso y errores del archivo removido
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  }, [previews]);

  // Remover imagen ya subida
  const handleRemoveExistingImage = useCallback((id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      onImagesUploaded({ type: 'remove', id });
    }
  }, [onImagesUploaded]);

  // Subir todos los archivos
  const handleUploadAll = useCallback(async () => {
    if (files.length === 0) {
      alert("No hay archivos para subir");
      return;
    }

    if (isUploading) {
      return; // Prevenir múltiples subidas simultáneas
    }

    setIsUploading(true);
    setUploadErrors([]);
    const uploadedImages = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const preview = previews.find(p => p.file === file);
      
      if (!preview) continue;

      try {
        // Actualizar estado a "subiendo"
        setPreviews(prev => 
          prev.map(p => p.id === preview.id ? { ...p, status: 'uploading' } : p)
        );
        setUploadProgress(prev => ({ ...prev, [preview.id]: 0 }));

        // Subir archivo
        const url = await uploadFile(file, folder, prefix);
        
        // Éxito
        uploadedImages.push({ 
          id: Date.now() + i, 
          url,
          fileName: file.name 
        });
        
        setPreviews(prev => 
          prev.map(p => p.id === preview.id ? { ...p, status: 'success' } : p)
        );
        setUploadProgress(prev => ({ ...prev, [preview.id]: 100 }));

      } catch (error) {
        console.error("Error al subir imagen:", error);
        
        // Determinar mensaje de error específico
        let errorMsg = `${file.name}: `;
        if (error.message.includes('Timeout')) {
          errorMsg += 'La imagen tardó demasiado en procesarse (muy grande o conexión lenta)';
        } else if (error.message.includes('demasiado grande')) {
          errorMsg += 'El archivo es demasiado grande';
        } else if (error.message.includes('comprimir')) {
          errorMsg += 'No se pudo comprimir la imagen';
        } else {
          errorMsg += error.message || 'Error desconocido';
        }
        
        errors.push(errorMsg);
        
        setPreviews(prev => 
          prev.map(p => p.id === preview.id ? { ...p, status: 'error' } : p)
        );
        setUploadProgress(prev => ({ ...prev, [preview.id]: -1 }));
      }
    }

    setIsUploading(false);

    // Notificar imágenes subidas exitosamente
    if (uploadedImages.length > 0) {
      onImagesUploaded({ type: 'add', images: uploadedImages });
      
      // Limpiar solo las imágenes subidas exitosamente
      setPreviews(prev => prev.filter(p => p.status !== 'success'));
      setFiles(prev => {
        const successfulFiles = previews
          .filter(p => p.status === 'success')
          .map(p => p.file);
        return prev.filter(f => !successfulFiles.includes(f));
      });
      setUploadProgress({});
    }

    // Mostrar errores
    if (errors.length > 0) {
      setUploadErrors(errors);
      const successCount = uploadedImages.length;
      const totalCount = files.length;
      if (successCount > 0) {
        alert(`Se subieron ${successCount} de ${totalCount} imágenes. Revisa los errores para más detalles.`);
      }
    } else if (uploadedImages.length > 0) {
      alert(`¡${uploadedImages.length} imagen(es) subida(s) correctamente!`);
    }

  }, [files, previews, folder, prefix, uploadFile, onImagesUploaded, isUploading]);

  // Abrir selector de archivos
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Determinar si se puede subir
  const canUpload = files.length > 0 && !isUploading && !uploading;

  return (
    <div className="image-uploader">
      {/* Área de drop */}
      <div
        className={`drop-area ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={preventDefaults}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        <div className="drop-message">
          <div className="upload-icon">📸</div>
          <p>Arrastra imágenes aquí o haz clic para seleccionar</p>
          <p className="file-info">
            Formatos: JPG, PNG, GIF, WebP | Máximo: {maxFiles} archivos | 5MB por imagen
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Previsualizaciones de archivos pendientes */}
      {previews.length > 0 && (
        <div className="preview-container">
          <h4>Archivos seleccionados ({previews.length})</h4>
          <div className="previews">
            {previews.map((item) => (
              <div key={item.id} className={`preview-item status-${item.status}`}>
                <img src={item.preview} alt="Preview" />
                <div className="preview-info">
                  <span className="file-name">{item.file.name}</span>
                  <span className="file-size">
                    {(item.file.size / 1024).toFixed(1)} KB
                  </span>
                  {uploadProgress[item.id] !== undefined && (
                    <div className={`upload-progress ${uploadProgress[item.id] === -1 ? 'error' : ''}`}>
                      {uploadProgress[item.id] === -1 
                        ? 'Error' 
                        : uploadProgress[item.id] === 100 
                        ? '✓ Subido' 
                        : `${uploadProgress[item.id]}%`
                      }
                    </div>
                  )}
                </div>
                <button
                  className="remove-button"
                  onClick={() => handleRemoveFile(item.id)}
                  disabled={item.status === 'uploading'}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón de subida */}
      {files.length > 0 && (
        <button
          className="upload-button"
          onClick={handleUploadAll}
          disabled={!canUpload}
        >
          {isUploading || uploading 
            ? `Subiendo ${files.length} imagen(es)...` 
            : `Subir ${files.length} imagen(es)`
          }
        </button>
      )}

      {/* Errores de subida */}
      {uploadErrors.length > 0 && (
        <div className="upload-errors">
          <h4>⚠️ Errores al subir:</h4>
          {uploadErrors.map((error, index) => (
            <div key={index} className="error-message">
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Error general del hook */}
      {uploadError && (
        <div className="upload-errors">
          <div className="error-message">{uploadError}</div>
        </div>
      )}

      {/* Imágenes ya subidas */}
      {existingImages && existingImages.length > 0 && (
        <div className="existing-images">
          <h4>Imágenes subidas ({existingImages.length})</h4>
          <div className="previews">
            {existingImages.map((image) => (
              <div key={image.id} className="preview-item">
                <img src={image.url} alt="Uploaded" />
                <button
                  className="remove-button"
                  onClick={() => handleRemoveExistingImage(image.id)}
                  title="Eliminar imagen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ImageUploader);