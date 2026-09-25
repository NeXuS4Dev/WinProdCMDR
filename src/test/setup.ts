/**
 * Vitest setup: polyfills jsdom lacks for Fluent UI v8.
 */

import { configure } from '@testing-library/dom';

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

if (!(window as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
}

if (!(window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
}

// Fluent measures text with canvas in some components
if (!HTMLCanvasElement.prototype.getContext) {
  // jsdom returns null by default; Fluent handles null but be explicit
}

configure({ asyncUtilTimeout: 6000 });

// jsdom lacks URL.createObjectURL
if (!URL.createObjectURL) {
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:mock';
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
}
