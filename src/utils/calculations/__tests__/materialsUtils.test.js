import { calculateMaterials } from '../materialsUtils';

describe('materialsUtils - calculateMaterials', () => {
  // Caso básico con lista de materiales
  test('calcula correctamente el coste total de materiales', () => {
    const materials = [
      { id: 1, description: 'Material 1', cost: 100.5 },
      { id: 2, description: 'Material 2', cost: 50.75 },
      { id: 3, description: 'Material 3', cost: 200 }
    ];
    
    const result = calculateMaterials(materials);
    
    // Verificar el cálculo del coste total
    expect(result.totalMaterialsCost).toBe(351.25); // 100.5 + 50.75 + 200
    
    // Verificar que devuelve la lista formateada
    expect(result.materialItems).toHaveLength(3);
    expect(result.materialItems[0].formattedCost).toBe(100.5);
  });
  
  // Caso de lista vacía
  test('devuelve cero cuando la lista de materiales está vacía', () => {
    const materials = [];
    
    const result = calculateMaterials(materials);
    
    expect(result.totalMaterialsCost).toBe(0);
    expect(result.materialItems).toEqual([]);
  });
  
  // Caso sin datos (valores por defecto)
  test('devuelve valores por defecto cuando no hay datos', () => {
    const result = calculateMaterials();
    
    expect(result.totalMaterialsCost).toBe(0);
    expect(result.materialItems).toEqual([]);
  });
  
  // Caso con valores no numéricos
  test('maneja correctamente materiales con costes no numéricos', () => {
    const materials = [
      { id: 1, description: 'Material 1', cost: '100.5' }, // String que se puede parsear
      { id: 2, description: 'Material 2', cost: 'no es un número' }, // No se puede parsear
      { id: 3, description: 'Material 3', cost: undefined }, // Undefined
      { id: 4, description: 'Material 4', cost: null }    // Null
    ];
    
    const result = calculateMaterials(materials);
    
    // Solo el primer valor debe contarse correctamente
    expect(result.totalMaterialsCost).toBe(100.5);
    
    // Verificar que los valores no numéricos se convierten a 0
    expect(result.materialItems[1].formattedCost).toBe(0);
    expect(result.materialItems[2].formattedCost).toBe(0);
    expect(result.materialItems[3].formattedCost).toBe(0);
  });
  
  // Caso con coste negativo (que no debería ocurrir en un caso real)
  test('maneja correctamente materiales con costes negativos', () => {
    const materials = [
      { id: 1, description: 'Material con descuento', cost: -50 },
      { id: 2, description: 'Material normal', cost: 150 }
    ];
    
    const result = calculateMaterials(materials);
    
    // Los costes negativos deberían contarse (si la lógica de negocio lo permite)
    expect(result.totalMaterialsCost).toBe(100); // -50 + 150
  });
  
  // Caso con propiedades faltantes
  test('maneja correctamente materiales con propiedades faltantes', () => {
    const materials = [
      { id: 1 }, // Sin descripción ni coste
      { id: 2, description: 'Solo descripción' }, // Sin coste
      { cost: 100 } // Sin ID ni descripción
    ];
    
    const result = calculateMaterials(materials);
    
    // Debería contar solo el último coste válido
    expect(result.totalMaterialsCost).toBe(100);
    
    // Verificar formattedCost para cada material
    expect(result.materialItems[0].formattedCost).toBe(0);
    expect(result.materialItems[1].formattedCost).toBe(0);
    expect(result.materialItems[2].formattedCost).toBe(100);
  });
});