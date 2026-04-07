import { describe, it, expect, afterEach } from 'vitest';
import { Session } from '../session.js';
import { handleBatchGenerate } from '../tools/batch-tools.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('batch_generate', () => {
  const tmpFiles: string[] = [];

  afterEach(() => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    tmpFiles.length = 0;
  });

  it('generates multiple PNG variations from a template', () => {
    const baseDir = os.tmpdir();
    const out1 = path.join(baseDir, `batch-out-0-${Date.now()}.png`);
    const out2 = path.join(baseDir, `batch-out-1-${Date.now()}.png`);
    tmpFiles.push(out1, out2);

    const session = new Session();
    const result = handleBatchGenerate(session, {
      template: [
        { tool: 'create_canvas', args: { width: 4, height: 4 } },
        { tool: 'fill', args: { x: 0, y: 0, color: '$color' } },
      ],
      variations: [
        { color: '#ff0000', out: out1 },
        { color: '#0000ff', out: out2 },
      ],
      export: { tool: 'export_png', args: { path: '$out' } },
    });

    expect(result.content[0].text).toContain('2 variations');
    expect(fs.existsSync(out1)).toBe(true);
    expect(fs.existsSync(out2)).toBe(true);
  });

  it('provides $index variable automatically', () => {
    const baseDir = os.tmpdir();
    const timestamp = Date.now();
    const out0 = path.join(baseDir, `batch-idx-0-${timestamp}.png`);
    const out1 = path.join(baseDir, `batch-idx-1-${timestamp}.png`);
    tmpFiles.push(out0, out1);

    const session = new Session();
    handleBatchGenerate(session, {
      template: [
        { tool: 'create_canvas', args: { width: 4, height: 4 } },
      ],
      variations: [
        { outDir: baseDir, ts: String(timestamp) },
        { outDir: baseDir, ts: String(timestamp) },
      ],
      export: {
        tool: 'export_png',
        args: { path: `${baseDir}/batch-idx-$index-${timestamp}.png` },
      },
    });

    expect(fs.existsSync(out0)).toBe(true);
    expect(fs.existsSync(out1)).toBe(true);
  });

  it('throws for unknown tool in template', () => {
    const session = new Session();
    expect(() => handleBatchGenerate(session, {
      template: [
        { tool: 'nonexistent_tool', args: {} },
      ],
      variations: [{}],
      export: { tool: 'export_png', args: { path: '/tmp/x.png' } },
    })).toThrow(/Unknown tool/);
  });

  it('each variation gets a fresh session (no shared state)', () => {
    const baseDir = os.tmpdir();
    const timestamp = Date.now();
    const out0 = path.join(baseDir, `fresh-0-${timestamp}.png`);
    const out1 = path.join(baseDir, `fresh-1-${timestamp}.png`);
    tmpFiles.push(out0, out1);

    const session = new Session();
    // Both variations use same size but different fill colors
    handleBatchGenerate(session, {
      template: [
        { tool: 'create_canvas', args: { width: 4, height: 4 } },
        { tool: 'fill', args: { x: 0, y: 0, color: '$color' } },
      ],
      variations: [
        { color: '#ff0000', out: out0 },
        { color: '#00ff00', out: out1 },
      ],
      export: { tool: 'export_png', args: { path: '$out' } },
    });

    // Both files should exist
    expect(fs.existsSync(out0)).toBe(true);
    expect(fs.existsSync(out1)).toBe(true);
  });
});
