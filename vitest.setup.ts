import '@testing-library/jest-dom';

// Suppress jsdom "Not implemented: HTMLCanvasElement.getContext()" warnings
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
