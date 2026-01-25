import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { nanoid } from 'nanoid';


export const git = simpleGit();

/**
 * Fetches changes from upstream without merging.
 */
export async function fetchUpstream() {
  await git.fetch();
}

/**
 * Gets the diff string for scanning.
 */
export async function getUpstreamDiff() {
  // Compare HEAD vs FETCH_HEAD (which is what was just fetched)
  return await git.diff(['HEAD..FETCH_HEAD']);
}

/**
 * Merges FETCH_HEAD into the current branch.
 */
export async function mergeUpstream() {
  await git.merge(['FETCH_HEAD']);
}

/**
 * Clones into a temporary sandbox in system temp directory.
 */
export async function createSandboxClone(url) {
  const randomId = nanoid(8);
  const tempPath = path.join(os.tmpdir(), `vanguard_${randomId}`);

  // Ensure fresh directory
  await fs.remove(tempPath);
  await fs.ensureDir(tempPath);

  const tempGit = simpleGit(tempPath);
  await tempGit.clone(url, '.');
  return tempPath;
}

/**
 * Moves files from sandbox to target and cleans up.
 * Uses fs-extra to handle cross-partition moves safely.
 */
export async function finalizeClone(tempPath, targetPath) {
  const absTemp = path.resolve(tempPath);
  const absTarget = path.resolve(targetPath);

  try {
    // Ensure parent directory of target exists
    await fs.ensureDir(path.dirname(absTarget));

    // Use fs-extra move which handles cross-device moves automatically
    await fs.move(absTemp, absTarget, { overwrite: true });
  } catch (e) {
    throw new Error(`Failed to finalize clone: ${e.message}`);
  } finally {
    // Final cleanup attempt
    await cleanupSandbox(tempPath);
  }
}

/**
 * Completely removes the sandbox.
 */
export async function cleanupSandbox(tempPath) {
  await fs.remove(tempPath).catch(() => { });
}
