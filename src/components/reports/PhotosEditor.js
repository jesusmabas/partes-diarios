import React, { useState } from "react";

const PhotosEditor = ({ 
  photos, 
  onPhotosChange, 
  projectId, 
  reportDate,
  uploadFile 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleAddPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      setUploadError("Por favor, selecciona un archivo de imagen válido.");
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      
      const url = await uploadFile(file, "photos", `${projectId}_${reportDate}`);
      
      if (url) {
        const newPhoto = { id: Date.now(), url };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch (err) {
      setUploadError(`Error al subir foto: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (id) => {
    onPhotosChange(photos.filter(p => p.id !== id));
  };

  return (
    <div className="photos-editor">
      <h4>Fotografías</h4>
      
      {uploadError && <p className="error-message">{uploadError}</p>}
      
      <div className="photos-container">
        {photos.map(photo => (
          <div key={photo.id} className="photo-container">
            <img 
              src={photo.url} 
              alt="Foto" 
              className="photo-thumbnail" 
            />
            <button 
              type="button" 
              onClick={() => handleRemovePhoto(photo.id)}
              className="remove-photo-button"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
      
      <div className="upload-container">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleAddPhoto} 
          disabled={uploading} 
          id="photo-upload"
          className="file-input"
        />
        <label htmlFor="photo-upload" className="upload-label">
          {uploading ? "Subiendo..." : "Añadir fotografía"}
        </label>
      </div>
    </div>
  );
};

export default React.memo(PhotosEditor);