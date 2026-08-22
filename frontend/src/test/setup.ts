// Setup global para vitest: matchers de jest-dom (toBeInTheDocument, etc.)
// y limpieza del DOM entre pruebas.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
