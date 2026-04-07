import * as fs from 'node:fs';
import { PixelArtError } from './errors.js';

interface LockContent {
  pid: number;
  timestamp: number;
}

function lockPath(filePath: string): string {
  return filePath + '.lock';
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireLock(filePath: string): void {
  const lock = lockPath(filePath);
  if (fs.existsSync(lock)) {
    try {
      const content: LockContent = JSON.parse(fs.readFileSync(lock, 'utf-8'));
      if (isProcessAlive(content.pid)) {
        throw new PixelArtError('FILE_LOCKED', `File is locked by PID ${content.pid}`);
      }
    } catch (e) {
      if (e instanceof PixelArtError) throw e;
      // Corrupt or unreadable lock file — proceed to overwrite
    }
  }
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
}

export function releaseLock(filePath: string): void {
  try {
    fs.unlinkSync(lockPath(filePath));
  } catch {
    // Ignore errors if lock file doesn't exist
  }
}

export function isLocked(filePath: string): boolean {
  const lock = lockPath(filePath);
  if (!fs.existsSync(lock)) return false;
  try {
    const content: LockContent = JSON.parse(fs.readFileSync(lock, 'utf-8'));
    return isProcessAlive(content.pid);
  } catch {
    return false;
  }
}
