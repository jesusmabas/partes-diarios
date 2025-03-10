import React, { useState, useEffect } from "react";
import { Image as PDFImage, View, Text } from "@react-pdf/renderer";

// Componente para comprimir imágenes antes de mostrarlas en el PDF
const CompressedImage = ({ src, style, maxWidth = 600, maxHeight = 500, quality = 0.6 }) => {
  const [compressedSrc, setCompressedSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const compressImage = async () => {
      if (!src || typeof src !== "string" || !src.startsWith("http")) {
        setError(true);
        return;
      }

      try {
        // Crear un elemento de imagen para cargar la imagen original
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Necesario para imágenes de otros dominios

        img.onload = () => {
          // Crear un canvas para redimensionar y comprimir la imagen
          const canvas = document.createElement("canvas");
          
          // Calcular las nuevas dimensiones manteniendo la proporción
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
          
          // Dibujar la imagen redimensionada en el canvas
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir el canvas a una URL de datos con la calidad especificada
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          setCompressedSrc(compressedDataUrl);
        };

        img.onerror = () => {
          setError(true);
        };

        // Iniciar la carga de la imagen
        img.src = src;
      } catch (error) {
        console.error("Error al comprimir imagen:", error);
        setError(true);
      }
    };

    compressImage();
  }, [src, maxWidth, maxHeight, quality]);

  if (error) {
    return (
      <View style={{ ...style, backgroundColor: "#f0f0f0", padding: 5 }}>
        <Text style={{ fontSize: 10, textAlign: "center" }}>Imagen no disponible</Text>
      </View>
    );
  }

  return compressedSrc ? <PDFImage src={compressedSrc} style={style} /> : null;
};

export default CompressedImage;