// src/utils/calculations/materialsUtils.js

/**
 * Calcula los datos relacionados con materiales
 * 
 * @param {Array} materials - Lista de materiales con costes
 * @returns {Object} Resultados de los cálculos de materiales
 */
export function calculateMaterials(materials = []) {
  if (!materials || !Array.isArray(materials)) {
    return {
      totalMaterialsCost: 0,
      materialItems: []
    };
  }

  // Calcular el coste total de materiales
  const totalMaterialsCost = materials.reduce((sum, material) => {
    return sum + (parseFloat(material.cost) || 0);
  }, 0);

  // Devolver también la lista de materiales procesada
  const materialItems = materials.map(material => ({
    ...material,
    formattedCost: parseFloat(material.cost) || 0
  }));

  return {
    totalMaterialsCost,
    materialItems
  };
}