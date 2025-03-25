module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    // Manejar importaciones de archivos estáticos
    '\\.(css|less|scss|sass)
: '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)
: '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(js|jsx)
: 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',  
    '!src/reportWebVitals.js',
    '!src/firebase.js', // Excluir configuraciones
    '!src/App.js',      // Generalmente se testea con tests de integración
    // Enfocarse especialmente en los archivos de utilidades y hooks
    'src/utils/calculations/**/*.js',
    'src/utils/calculationUtils.js',
    'src/utils/formatters.js',
    'src/hooks/useCalculationsService.js',
    'src/hooks/useFormValidation.js',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};