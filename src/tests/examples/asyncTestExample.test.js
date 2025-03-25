// Este archivo muestra cómo testear operaciones asíncronas correctamente

// Mock de una función asíncrona (similar a una llamada a Firestore)
const mockFetchData = jest.fn(async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'project1',
        client: 'Cliente Test',
        budgetAmount: 5000
      });
    }, 100);
  });
});

// Función que usa la operación asíncrona
const getProjectDetails = async (projectId) => {
  try {
    const data = await mockFetchData(projectId);
    return data;
  } catch (error) {
    throw new Error(`Error al obtener datos: ${error.message}`);
  }
};

// Tests para funciones asíncronas
describe('Ejemplo de Tests Asíncronos', () => {
  // Resetear mocks después de cada test
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Método 1: Usando async/await
  test('método 1: async/await para operaciones asíncronas', async () => {
    // Configurar mock para este test específico
    mockFetchData.mockResolvedValueOnce({
      id: 'project1',
      client: 'Cliente Específico',
      budgetAmount: 10000
    });
    
    // Llamar a la función asíncrona
    const result = await getProjectDetails('project1');
    
    // Verificar resultado
    expect(result).toEqual({
      id: 'project1',
      client: 'Cliente Específico',
      budgetAmount: 10000
    });
    
    // Verificar que la función mock fue llamada
    expect(mockFetchData).toHaveBeenCalledTimes(1);
    expect(mockFetchData).toHaveBeenCalledWith('project1');
  });
  
  // Método 2: Usando then/catch con done callback (estilo antiguo)
  test('método 2: then/catch con done callback', (done) => {
    mockFetchData.mockResolvedValueOnce({
      id: 'project2',
      client: 'Otro Cliente',
      budgetAmount: 7500
    });
    
    getProjectDetails('project2')
      .then(result => {
        try {
          expect(result).toEqual({
            id: 'project2',
            client: 'Otro Cliente',
            budgetAmount: 7500
          });
          expect(mockFetchData).toHaveBeenCalledWith('project2');
          done(); // Importante: indicar que el test ha finalizado
        } catch (error) {
          done(error); // Si hay un error en las aserciones, pasarlo a done
        }
      })
      .catch(error => {
        done(error); // Si hay un error en la promesa, pasarlo a done
      });
  });
  
  // Método 3: Usando resolves/rejects (muy claro y conciso)
  test('método 3: expect con resolves', async () => {
    mockFetchData.mockResolvedValueOnce({
      id: 'project3',
      client: 'Tercer Cliente',
      budgetAmount: 3000
    });
    
    // Usar resolves para esperar que la promesa se resuelva y cumplir las condiciones
    await expect(getProjectDetails('project3')).resolves.toEqual({
      id: 'project3',
      client: 'Tercer Cliente',
      budgetAmount: 3000
    });
  });
  
  // Test para casos de error
  test('maneja correctamente los errores', async () => {
    // Configurar mock para que rechace la promesa
    mockFetchData.mockRejectedValueOnce(new Error('Error en la base de datos'));
    
    // Comprobar que la función propaga el error correctamente
    await expect(getProjectDetails('error-id')).rejects.toThrow('Error al obtener datos');
    
    // Verificar que la función mock fue llamada antes de fallar
    expect(mockFetchData).toHaveBeenCalledTimes(1);
    expect(mockFetchData).toHaveBeenCalledWith('error-id');
  });
});