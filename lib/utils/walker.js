import fs from 'fs/promises';
import path from 'path';

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'venv', '.env'];
const IGNORE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.mp4',
  '.zip',
  '.exe',
  '.dll',
  '.lock',
];
const MAX_FILE_SIZE = 100 * 1024; // 100KB

export async function walkProject(dir) {
  let results = [];
  const list = await fs.readdir(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      if (IGNORE_DIRS.includes(file)) continue;
      results = results.concat(await walkProject(fullPath));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (IGNORE_EXTENSIONS.includes(ext)) continue;
      if (stat.size > MAX_FILE_SIZE) continue;
      results.push(fullPath);
    }
  }

  return results;
}
