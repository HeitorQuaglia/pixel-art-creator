import type { Document } from '@pixel-art/core';
import { flattenLayers } from '@pixel-art/core';

export function renderDocument(ctx: CanvasRenderingContext2D, doc: Document, zoom: number, gridVisible: boolean): void {
  const canvasW = doc.width * zoom;
  const canvasH = doc.height * zoom;
  ctx.canvas.width = canvasW;
  ctx.canvas.height = canvasH;
  drawCheckerboard(ctx, doc.width, doc.height, zoom);
  const flattened = flattenLayers(doc.layers, doc.width, doc.height);
  const imageData = ctx.createImageData(doc.width, doc.height);
  imageData.data.set(flattened);
  ctx.imageSmoothingEnabled = false;
  const tempCanvas = new OffscreenCanvas(doc.width, doc.height);
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0, canvasW, canvasH);
  if (gridVisible && zoom >= 4) drawGrid(ctx, doc.width, doc.height, zoom);
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number): void {
  const light = '#2a2a3a', dark = '#222236';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? light : dark;
      ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x++) { ctx.beginPath(); ctx.moveTo(x * zoom + 0.5, 0); ctx.lineTo(x * zoom + 0.5, height * zoom); ctx.stroke(); }
  for (let y = 0; y <= height; y++) { ctx.beginPath(); ctx.moveTo(0, y * zoom + 0.5); ctx.lineTo(width * zoom, y * zoom + 0.5); ctx.stroke(); }
}
