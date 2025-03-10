// src/hooks/useStorage.js - Versión mejorada
import { useState, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { v4 as uuidv4 } from "uuid";

export const useStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // Función para comprimir imagen antes de subir
  const compressImage = async (file, maxWidth = 1200, maxHeight = 1000, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      // Verificar si el archivo es una imagen
      if (!file.type.match(/image.*/)) {
        return resolve(file); // Si no es imagen, devolver el archivo original
      }

      // Crear un elemento de imagen para cargar el archivo
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = () => {
        // Crear un canvas para redimensionar la imagen
        const canvas = document.createElement('canvas');
        
        // Calcular dimensiones manteniendo la proporción
        let width = img.width;
        let height = img.height;
        
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
        
        // Dibujar la imagen redimensionada
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob con la calidad especificada
        canvas.toBlob((blob) => {
          if (blob) {
            // Crear un nuevo archivo con el blob comprimido
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            resolve(compressedFile);
          } else {
            reject(new Error('Error al comprimir la imagen'));
          }
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar la imagen para compresión'));
      };
    });
  };

  const uploadFile = useCallback(async (file, folder, fileNamePrefix) => {
    if (!file) return null;
    setUploading(true);
    setError(null);
    setProgress(0);
    
    try {
      // Comprimir la imagen si es necesario
      let fileToUpload = file;
      
      // Solo comprimir si es una imagen
      if (file.type.match(/image.*/)) {
        fileToUpload = await compressImage(file);
        console.log(`Imagen comprimida: ${file.size} -> ${fileToUpload.size} bytes`);
      }
      
      // Generar nombre de archivo único
      const fileName = `${fileNamePrefix}_${uuidv4()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const storageRef = ref(storage, `${folder}/${fileName}`);
      
      // Subir archivo
      await uploadBytes(storageRef, fileToUpload);
      setProgress(100);
      
      // Obtener URL de descarga
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploadFile, uploading, progress, error };
};