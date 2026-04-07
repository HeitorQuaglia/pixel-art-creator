import { describe, it, expect, beforeEach } from 'vitest';
import { createCanvas, setPixel, getPixel } from '../canvas.js';
import { flipH, flipV, rotate90, resize } from '../transform.js';

describe('flipH', () => {
  it('swaps left and right pixels', () => {
    const data = createCanvas(4, 2);
    // Set distinct pixels on left and right
    setPixel(data, 4, 0, 0, '#ff0000'); // left
    setPixel(data, 4, 3, 0, '#0000ff'); // right
    flipH(data, 4, 2);
    expect(getPixel(data, 4, 0, 0)).toBe('#0000ffff');
    expect(getPixel(data, 4, 3, 0)).toBe('#ff0000ff');
  });

  it('preserves pixels in the center for odd width', () => {
    const data = createCanvas(3, 1);
    setPixel(data, 3, 1, 0, '#00ff00'); // center
    flipH(data, 3, 1);
    expect(getPixel(data, 3, 1, 0)).toBe('#00ff00ff');
  });

  it('flips all rows independently', () => {
    const data = createCanvas(2, 2);
    setPixel(data, 2, 0, 0, '#ff0000');
    setPixel(data, 2, 1, 1, '#0000ff');
    flipH(data, 2, 2);
    expect(getPixel(data, 2, 1, 0)).toBe('#ff0000ff');
    expect(getPixel(data, 2, 0, 1)).toBe('#0000ffff');
  });
});

describe('flipV', () => {
  it('swaps top and bottom rows', () => {
    const data = createCanvas(2, 4);
    setPixel(data, 2, 0, 0, '#ff0000'); // top
    setPixel(data, 2, 0, 3, '#0000ff'); // bottom
    flipV(data, 2, 4);
    expect(getPixel(data, 2, 0, 0)).toBe('#0000ffff');
    expect(getPixel(data, 2, 0, 3)).toBe('#ff0000ff');
  });

  it('preserves middle row for odd height', () => {
    const data = createCanvas(1, 3);
    setPixel(data, 1, 0, 1, '#00ff00'); // center row
    flipV(data, 1, 3);
    expect(getPixel(data, 1, 0, 1)).toBe('#00ff00ff');
  });

  it('flips all columns independently', () => {
    const data = createCanvas(2, 2);
    setPixel(data, 2, 0, 0, '#ff0000');
    setPixel(data, 2, 1, 1, '#0000ff');
    flipV(data, 2, 2);
    expect(getPixel(data, 2, 0, 1)).toBe('#ff0000ff');
    expect(getPixel(data, 2, 1, 0)).toBe('#0000ffff');
  });
});

describe('rotate90', () => {
  it('rotates a 2x3 canvas to 3x2', () => {
    const data = createCanvas(2, 3);
    // (0,0)=red, (1,0)=green, (0,1)=blue, (1,1)=white, (0,2)=cyan, (1,2)=yellow
    setPixel(data, 2, 0, 0, '#ff0000');
    setPixel(data, 2, 1, 0, '#00ff00');
    setPixel(data, 2, 0, 1, '#0000ff');
    setPixel(data, 2, 1, 1, '#ffffff');
    setPixel(data, 2, 0, 2, '#00ffff');
    setPixel(data, 2, 1, 2, '#ffff00');

    const result = rotate90(data, 2, 3);
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);

    // After 90-degree clockwise rotation: new(x, y) = old(y, newHeight - 1 - x)
    // new(x, y) gets old(height - 1 - y, x)
    // In rotate90 implementation: dstIdx = pixelIndex(newWidth, height - 1 - y, x)
    // src(x=0,y=0) -> dst(height-1-0=2, x=0) = dst(2, 0) -> getPixel at (2, 0) should be red
    expect(getPixel(result.data, 3, 2, 0)).toBe('#ff0000ff');
    // src(x=1,y=0) -> dst(2, 1) -> getPixel at (2, 1) should be green
    expect(getPixel(result.data, 3, 2, 1)).toBe('#00ff00ff');
    // src(x=0,y=2) -> dst(height-1-2=0, 0) -> getPixel at (0, 0) should be cyan
    expect(getPixel(result.data, 3, 0, 0)).toBe('#00ffffff');
  });

  it('rotates a square canvas correctly', () => {
    const data = createCanvas(2, 2);
    setPixel(data, 2, 0, 0, '#ff0000'); // top-left
    setPixel(data, 2, 1, 0, '#00ff00'); // top-right
    setPixel(data, 2, 0, 1, '#0000ff'); // bottom-left
    setPixel(data, 2, 1, 1, '#ffffff'); // bottom-right

    const result = rotate90(data, 2, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    // After rotate90: top-left becomes top-right after CW rotation (bottom-left goes to top-left)
    // src(0,0)->dst(height-1-0=1, 0): dst pixel at (1,0) = red
    expect(getPixel(result.data, 2, 1, 0)).toBe('#ff0000ff');
    // src(1,0)->dst(1, 1) = green
    expect(getPixel(result.data, 2, 1, 1)).toBe('#00ff00ff');
    // src(0,1)->dst(0, 0) = blue
    expect(getPixel(result.data, 2, 0, 0)).toBe('#0000ffff');
    // src(1,1)->dst(0, 1) = white
    expect(getPixel(result.data, 2, 0, 1)).toBe('#ffffffff');
  });
});

describe('resize', () => {
  it('upscales 2x2 to 4x4 using nearest-neighbor', () => {
    const data = createCanvas(2, 2);
    setPixel(data, 2, 0, 0, '#ff0000');
    setPixel(data, 2, 1, 0, '#00ff00');
    setPixel(data, 2, 0, 1, '#0000ff');
    setPixel(data, 2, 1, 1, '#ffffff');

    const result = resize(data, 2, 2, 4, 4);
    expect(result.byteLength).toBe(4 * 4 * 4);

    // Each original pixel maps to a 2x2 block
    expect(getPixel(result, 4, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(result, 4, 1, 0)).toBe('#ff0000ff');
    expect(getPixel(result, 4, 2, 0)).toBe('#00ff00ff');
    expect(getPixel(result, 4, 3, 0)).toBe('#00ff00ff');
    expect(getPixel(result, 4, 0, 2)).toBe('#0000ffff');
    expect(getPixel(result, 4, 3, 3)).toBe('#ffffffff');
  });

  it('downscales 4x4 to 2x2 using nearest-neighbor', () => {
    const data = createCanvas(4, 4);
    // Fill quadrants
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) setPixel(data, 4, x, y, '#ff0000');
    for (let y = 0; y < 2; y++) for (let x = 2; x < 4; x++) setPixel(data, 4, x, y, '#00ff00');
    for (let y = 2; y < 4; y++) for (let x = 0; x < 2; x++) setPixel(data, 4, x, y, '#0000ff');
    for (let y = 2; y < 4; y++) for (let x = 2; x < 4; x++) setPixel(data, 4, x, y, '#ffffff');

    const result = resize(data, 4, 4, 2, 2);
    expect(result.byteLength).toBe(2 * 2 * 4);
    expect(getPixel(result, 2, 0, 0)).toBe('#ff0000ff');
    expect(getPixel(result, 2, 1, 0)).toBe('#00ff00ff');
    expect(getPixel(result, 2, 0, 1)).toBe('#0000ffff');
    expect(getPixel(result, 2, 1, 1)).toBe('#ffffffff');
  });

  it('returns a new canvas without modifying the original', () => {
    const data = createCanvas(2, 2);
    setPixel(data, 2, 0, 0, '#ff0000');
    const original = new Uint8ClampedArray(data);
    resize(data, 2, 2, 4, 4);
    expect(data).toEqual(original);
  });
});
