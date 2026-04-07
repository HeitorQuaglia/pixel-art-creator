export type ErrorCode =
  | 'OUT_OF_BOUNDS'
  | 'INVALID_LAYER_INDEX'
  | 'INVALID_COLOR_FORMAT'
  | 'FILE_NOT_FOUND'
  | 'FILE_LOCKED'
  | 'CANVAS_TOO_LARGE'
  | 'INVALID_ARGS';

export class PixelArtError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PixelArtError';
  }
}
