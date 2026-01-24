import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { tmpdir } from 'os';

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
 */
export async function finalizeClone(tempPath, targetPath) {
    // Move files (this logic depends on OS, simpler to rename if same drive)
    await fs.rename(tempPath, targetPath);
}

/**
 * Completely removes the sandbox.
 */
export async function cleanupSandbox(tempPath) {
    await fs.rm(tempPath, { recursive: true, force: true }).catch(() => { });
}
