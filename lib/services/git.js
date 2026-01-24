import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';


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
 * Clones into a temporary sandbox.
 */
export async function createSandboxClone(url) {
  const tempPath = path.join(process.cwd(), '.vanguard_temp');

  // Cleanup if exists
  await fs.rm(tempPath, { recursive: true, force: true }).catch(() => { });
  await fs.mkdir(tempPath, { recursive: true });

  const tempGit = simpleGit(tempPath);
  await tempGit.clone(url, '.');
  return tempPath;
}

/**
 * Moves files from sandbox to target and cleans up.
 * Improved for Windows EPERM stability.
 */
export async function finalizeClone(tempPath, targetPath) {
  const absTemp = path.resolve(tempPath);
  const absTarget = path.resolve(targetPath);

  try {
    await fs.rename(absTemp, absTarget);
  } catch (e) {
    if (e.code === 'EPERM' || e.code === 'EXDEV' || e.code === 'EACCES') {
      // Fallback: Force purge target if it exists, then copy
      await fs.rm(absTarget, { recursive: true, force: true }).catch(() => { });
      await fs.cp(absTemp, absTarget, { recursive: true, force: true });
      await fs.rm(absTemp, { recursive: true, force: true });
    } else {
      throw e;
    }
  }
}

/**
 * Completely removes the sandbox.
 */
export async function cleanupSandbox(tempPath) {
  await fs.rm(tempPath, { recursive: true, force: true }).catch(() => { });
}
