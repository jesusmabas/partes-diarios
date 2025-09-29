import { useState, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { v4 as uuidv4 } from "uuid";

export const useStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const compressImage = async (file, maxWidth = 1200, maxHeight = 1000, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      // Si no es una imagen, devolver el archivo original
      if (!file.type.match(/image.*/)) {
        return resolve(file);
      }

      // Timeout de 30 segundos para evitar que se cuelgue
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout: La imagen tardó demasiado en procesarse (puede ser muy grande)'));
      }, 30000);

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = () => {
        clearTimeout(timeoutId);
        
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo aspecto
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('No se pudo obtener contexto del canvas');
          }
          
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              // Limpiar URL del objeto
              URL.revokeObjectURL(objectUrl);
              
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Error al crear el blob de la imagen comprimida'));
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Error al cargar la imagen para compresión'));
      };
    });
  };

  const uploadFile = useCallback(async (file, folder, fileNamePrefix) => {
    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      // Validar que hay archivo
      if (!file) {
        throw new Error('No se proporcionó ningún archivo');
      }

      // Validar tamaño antes de procesar
      const maxSize = folder === 'photos' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxMB = maxSize / (1024 * 1024);
        throw new Error(`El archivo "${file.name}" es demasiado grande. Máximo ${maxMB}MB permitidos`);
      }

      // Validar tipo de archivo
      if (folder === 'photos' && !file.type.match(/image.*/)) {
        throw new Error(`"${file.name}" no es una imagen válida`);
      }
      if (folder === 'invoices' && file.type !== 'application/pdf') {
        throw new Error(`"${file.name}" no es un PDF válido`);
      }

      let fileToUpload = file;

      // Comprimir imágenes
      if (file.type.match(/image.*/)) {
        try {
          fileToUpload = await compressImage(file);
          const compressionRatio = ((1 - fileToUpload.size / file.size) * 100).toFixed(1);
          console.log(`Imagen comprimida: ${(file.size / 1024).toFixed(1)}KB -> ${(fileToUpload.size / 1024).toFixed(1)}KB (${compressionRatio}% reducción)`);
          setProgress(50); // Marcar progreso de compresión
        } catch (compressionError) {
          console.warn('Error al comprimir imagen, subiendo original:', compressionError.message);
          // Si la compresión falla por timeout u otro motivo, intentar con el original
          // pero solo si no es demasiado grande
          if (file.size <= maxSize) {
            fileToUpload = file;
          } else {
            throw new Error(`La imagen es demasiado grande y no se pudo comprimir: ${compressionError.message}`);
          }
        }
      }

      // Sanitizar nombres para cumplir con Storage Rules
      const sanitizedPrefix = String(fileNamePrefix || 'file')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .substring(0, 50); // Limitar longitud
      
      const fileExtension = file.name.split('.').pop() || 'bin';
      const sanitizedExtension = fileExtension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8); // Solo primeros 8 caracteres del UUID
      
      // Formato: prefix_timestamp_uniqueid.ext
      const fileName = `${sanitizedPrefix}_${timestamp}_${uniqueId}.${sanitizedExtension}`;

      console.log(`Subiendo archivo: ${fileName} (${(fileToUpload.size / 1024).toFixed(1)}KB)`);

      // Subir a Firebase Storage
      const storageRef = ref(storage, `${folder}/${fileName}`);
      await uploadBytes(storageRef, fileToUpload);
      
      setProgress(100);

      // Obtener URL de descarga
      const url = await getDownloadURL(storageRef);
      
      console.log(`Archivo subido exitosamente: ${url}`);
      return url;

    } catch (err) {
      console.error('Error en uploadFile:', err);
      const errorMessage = err.message || 'Error desconocido al subir archivo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploadFile,
    uploading,
    error,
    progress
  };
};