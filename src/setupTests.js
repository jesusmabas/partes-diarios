// jest-dom añade matchers personalizados de Jest para aserciones en nodos DOM.
import '@testing-library/jest-dom';

// Mock global.matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Silenciar mensajes de consola durante los tests
global.console = {
  ...console,
  // Descomenta las siguientes líneas para silenciar mensajes durante las pruebas
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};