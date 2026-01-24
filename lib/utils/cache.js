import crypto from 'crypto';
import Conf from 'conf';

const cacheStore = new Conf({ projectName: 'vanguard-enterprise-cache' });

export class CacheManager {
  /**
   * Calculate SHA-256 hash of file content.
   */
  static getHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if file is already verified as SAFE.
   */
  static check(filePath, content) {
    const hash = this.getHash(content);
    const cached = cacheStore.get(hash);

    if (cached && cached.verdict === 'SAFE') {
      return cached;
    }
    return null;
  }

  /**
   * Save verification verdict for a file hash.
   */
  static save(filePath, content, verdict) {
    const hash = this.getHash(content);
    cacheStore.set(hash, {
      path: filePath,
      verdict,
      timestamp: Date.now(),
    });
  }

  static clear() {
    cacheStore.clear();
  }
}
