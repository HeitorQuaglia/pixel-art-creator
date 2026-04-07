import { describe, it, expect } from 'vitest';
import { PixelArtError, ErrorCode } from '../errors.js';

describe('PixelArtError', () => {
  it('creates error with code and message', () => {
    const err = new PixelArtError('OUT_OF_BOUNDS', 'Pixel (5, 5) is outside canvas bounds (4, 4)');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('OUT_OF_BOUNDS');
    expect(err.message).toBe('Pixel (5, 5) is outside canvas bounds (4, 4)');
  });

  it('has all expected error codes', () => {
    const codes: ErrorCode[] = [
      'OUT_OF_BOUNDS', 'INVALID_LAYER_INDEX', 'INVALID_COLOR_FORMAT',
      'FILE_NOT_FOUND', 'FILE_LOCKED', 'CANVAS_TOO_LARGE', 'INVALID_ARGS',
    ];
    for (const code of codes) {
      const err = new PixelArtError(code, 'test');
      expect(err.code).toBe(code);
    }
  });
});
