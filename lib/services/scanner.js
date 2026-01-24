import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../utils/config.js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import pLimit from 'p-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THREATS_PATH = path.join(__dirname, '../threats.json');

const limit = pLimit(1); // Conservative concurrency for free tier stability

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class VanguardScanner {
  constructor(modelOverride, intelligenceContext = '') {
    this.provider = config.get('AI_PROVIDER');
    this.modelOverride = modelOverride;
    this.intelligenceContext = intelligenceContext;
  }

  shouldSkip(filePath, stats) {
    const ext = path.extname(filePath).toLowerCase();
    const binaryExtensions = [
      '.exe', '.dll', '.so', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.gz',
    ];
    if (binaryExtensions.includes(ext)) return true;
    if (stats.size > 100 * 1024) return true;
    if (filePath.includes('node_modules')) return true;
    return false;
  }

  async getSystemInstruction() {
    const threatsData = await fs.readFile(THREATS_PATH, 'utf-8');
    const threats = JSON.parse(threatsData);
    const categoriesListing = threats
      .map((t, i) => `${i + 1}. **${t.name}:** ${t.description}`)
      .join('\n');

    return `
You are a Senior Security Architect & Auditor. YOUR MISSION: Prevent Supply Chain Attacks.
Analyze the provided code/diff with extreme scrutiny.

YOU MUST BLOCK IF YOU DETECT ANY OF THESE CATEGORIES:
${categoriesListing}

${this.intelligenceContext}

JSON OUTPUT RULES:
- risk_score: 0-100.
- verdict: "BLOCK" or "SAFE".
- threats: Array of { "file", "line", "threat", "reason" }
- summary: Clear explanation.

RESPONSE FORMAT (JSON ONLY):
{ "risk_score": 95, "verdict": "BLOCK", "threats": [], "summary": "..." }
`;
  }

  async scan(filePath, content, spinner = null) {
    // Random Jitter Throttling (1s - 3s)
    if (this.provider === 'gemini') {
      const jitter = Math.floor(Math.random() * 2000) + 1000;
      await sleep(jitter);
    }
    return limit(() => this.scanWithRetry(filePath, content, spinner));
  }

  async scanWithRetry(filePath, content, spinner, attempt = 1) {
    const maxAttempts = 3;
    try {
      if (this.provider === 'gemini') {
        return await this.scanWithGemini(content);
      } else {
        return await this.scanWithOllama(content);
      }
    } catch (error) {
      const isRateLimit =
        error.message.includes('429') ||
        error.message.includes('Too Many Requests') ||
        error.message.includes('Quota');

      const isServerErr = error.message.includes('500') || error.message.includes('503');

      if (isRateLimit && attempt <= maxAttempts) {
        const waitTime = attempt === 1 ? 30 : 60; // Increase wait on second failure
        if (spinner) {
          const originalText = spinner.text;
          for (let i = waitTime; i > 0; i--) {
            spinner.text = `❄️ Quota hit. Cooling down API (${i}s remaining)...`;
            await sleep(1000);
          }
          spinner.text = originalText;
        } else {
          console.log(chalk.yellow(`\n⚠️ Rate limit hit. Cooling down for ${waitTime}s (Attempt ${attempt}/${maxAttempts})...`));
          await sleep(waitTime * 1000);
        }
        return this.scanWithRetry(filePath, content, spinner, attempt + 1);
      }

      if (isServerErr && attempt === 1) {
        if (spinner) spinner.text = '🔄 AI Server hiccup. Retrying immediately...';
        return this.scanWithRetry(filePath, content, spinner, attempt + 1);
      }

      throw error;
    }
  }

  async scanWithGemini(content) {
    const apiKey = config.get('GEMINI_KEY');
    if (!apiKey) throw new Error('Gemini API Key missing. Run "vanguard config"');

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the -latest alias for better cross-region compatibility
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const instruction = await this.getSystemInstruction();

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${instruction}\n\nFILE CONTENT:\n${content}` }] }],
    });

    const response = await result.response;
    return this.parseResponse(response.text());
  }

  async scanWithOllama(content) {
    const model = this.modelOverride || config.get('OLLAMA_MODEL');
    const url = `${config.get('OLLAMA_URL')}/api/generate`;
    const instruction = await this.getSystemInstruction();

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: `${instruction}\n\nFILE CONTENT:\n${content}`,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data = await response.json();
    return this.parseResponse(data.response);
  }

  parseResponse(text) {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found');
      return JSON.parse(text.substring(start, end + 1));
    } catch (e) {
      throw new Error(`Invalid AI JSON format: ${e.message}`);
    }
  }
}
