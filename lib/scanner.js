import { GoogleGenerativeAI } from '@google/generative-ai';
import config from './config.js';
import fetch from 'node-fetch';

const SYSTEM_INSTRUCTION = `
You are a Cyber Security Auditor. Analyze the git diff.
DETECT THESE 5 THREATS:
1. **Secret Theft:** .env or key exfiltration to external URLs.
2. **Wallet Drainers:** window.ethereum or private key access.
3. **Spyware:** Unnecessary os.userInfo or system data collection.
4. **Malicious Installers:** curl | bash in package.json/scripts.
5. **Obfuscation:** eval(), base64, hex-encoded logic.

OUTPUT JSON ONLY with this exact structure:
{ 
  "risk_score": 0-100, 
  "verdict": "SAFE" | "BLOCK", 
  "threats": ["string"], 
  "summary": "string" 
}
`;

export class VanguardScanner {
    constructor() {
        this.provider = config.get('AI_PROVIDER');
    }

    async scan(content) {
        if (this.provider === 'gemini') {
            return this.scanWithGemini(content);
        } else {
            return this.scanWithOllama(content);
        }
    }

    async scanWithGemini(content) {
        const apiKey = config.get('GEMINI_KEY');
        if (!apiKey) throw new Error('Gemini API Key missing. Run "vanguard config"');

        const genAI = new GoogleGenerativeAI(apiKey);
        // Explicitly using gemini-2.0-flash-exp as requested
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nDiff Content:\n${content}` }] }]
            });

            const response = await result.response;
            return this.parseResponse(response.text());
        } catch (error) {
            throw new Error(`Gemini 2.0 API Error: ${error.message}`);
        }
    }

    async scanWithOllama(content) {
        const model = config.get('OLLAMA_MODEL');
        const url = `${config.get('OLLAMA_URL')}/api/generate`;

        if (!model) throw new Error('Ollama model not selected. Run "vanguard config"');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: `${SYSTEM_INSTRUCTION}\n\nDiff Content:\n${content}`,
                    stream: false,
                    format: 'json'
                })
            });

            if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);

            const data = await response.json();
            return this.parseResponse(data.response);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('❌ Ollama not detected. Run "ollama serve" first.');
            }
            throw new Error(`Ollama Scan Failed: ${error.message}`);
        }
    }

    parseResponse(text) {
        try {
            const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
            return JSON.parse(jsonStr);
        } catch (e) {
            throw new Error('Could not parse AI response as valid JSON.');
        }
    }
}
