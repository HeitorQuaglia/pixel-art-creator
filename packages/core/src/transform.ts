import { createCanvas, pixelIndex } from './canvas.js';

export function flipH(data: Uint8ClampedArray, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.floor(width / 2); x++) {
      const leftIdx = pixelIndex(width, x, y);
      const rightIdx = pixelIndex(width, width - 1 - x, y);
      for (let c = 0; c < 4; c++) {
        const tmp = data[leftIdx + c];
        data[leftIdx + c] = data[rightIdx + c];
        data[rightIdx + c] = tmp;
      }
    }
  }
}

export function flipV(data: Uint8ClampedArray, width: number, height: number): void {
  const rowBytes = width * 4;
  const temp = new Uint8ClampedArray(rowBytes);
  for (let y = 0; y < Math.floor(height / 2); y++) {
    const topStart = y * rowBytes;
    const bottomStart = (height - 1 - y) * rowBytes;
    temp.set(data.subarray(topStart, topStart + rowBytes));
    data.copyWithin(topStart, bottomStart, bottomStart + rowBytes);
    data.set(temp, bottomStart);
  }
}

export function rotate90(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const newWidth = height;
  const newHeight = width;
  const result = createCanvas(newWidth, newHeight);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = pixelIndex(width, x, y);
      const dstIdx = pixelIndex(newWidth, height - 1 - y, x);
      result[dstIdx] = data[srcIdx];
      result[dstIdx + 1] = data[srcIdx + 1];
      result[dstIdx + 2] = data[srcIdx + 2];
      result[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { data: result, width: newWidth, height: newHeight };
}

export function resize(
  data: Uint8ClampedArray,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): Uint8ClampedArray {
  const result = createCanvas(newWidth, newHeight);
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor((x * oldWidth) / newWidth);
      const srcY = Math.floor((y * oldHeight) / newHeight);
      const srcIdx = pixelIndex(oldWidth, srcX, srcY);
      const dstIdx = pixelIndex(newWidth, x, y);
      result[dstIdx] = data[srcIdx];
      result[dstIdx + 1] = data[srcIdx + 1];
      result[dstIdx + 2] = data[srcIdx + 2];
      result[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return result;
}
