import React, { useCallback } from "react";
import ImageUploader from "./ImageUploader"; // Importamos nuestro nuevo componente

const WorkPerformedForm = ({ workPerformed, onWorkPerformedChange, projectId, reportDate }) => {
  const handleDescriptionChange = useCallback(
    (e) => {
      onWorkPerformedChange({ ...workPerformed, description: e.target.value });
    },
    [workPerformed, onWorkPerformedChange]
  );

  // Manejador para las imágenes subidas o eliminadas
  const handleImagesChange = useCallback(
    ({ type, images, id }) => {
      if (type === 'add' && images && images.length > 0) {
        // Añadir nuevas imágenes
        onWorkPerformedChange({
          ...workPerformed,
          photos: [...(workPerformed.photos || []), ...images],
        });
      } else if (type === 'remove' && id) {
        // Eliminar una imagen existente
        onWorkPerformedChange({
          ...workPerformed,
          photos: (workPerformed.photos || []).filter((p) => p.id !== id),
        });
      }
    },
    [workPerformed, onWorkPerformedChange]
  );

  return (
    <div>
      <h3>Trabajos realizados</h3>
      <textarea
        value={workPerformed.description || ""}
        onChange={handleDescriptionChange}
        placeholder="Descripción de los trabajos realizados"
      />
      
      {/* Reemplazamos el input file por nuestro ImageUploader */}
      <ImageUploader
        onImagesUploaded={handleImagesChange}
        folder="photos"
        prefix={`${projectId}_${reportDate}`}
        maxFiles={10}
        acceptedTypes="image/*"
        existingImages={workPerformed.photos || []}
      />
    </div>
  );
};

export default React.memo(WorkPerformedForm);