# Contributing to Vanguard 🛡️

First off, thank you for helping make the software supply chain safer! We welcome contributors of all skill levels.

## 🛡️ Security First
Vanguard is a security tool. When contributing code, please ensure:
1. **No new dependencies** are added unless absolutely necessary.
2. **AI Logic** is updated in `lib/services/scanner.js` with professional prompt engineering if you add new detection capabilities.
3. **Every new feature** MUST include unit tests in `test/`.

## 🧪 Development Workflow
1. **Fork & Clone**:
   ```bash
   git clone https://github.com/bazobehram/vanguard.git
   cd vanguard
   npm install
   ```
2. **Standardize**:
   ```bash
   npm run format  # Prettier
   npm run lint    # ESLint Flat Config
   ```
3. **Verify**:
   ```bash
   npm test               # Run Vitest suite
   node scripts/qa-wizard.js # Run interactive stress tests
   ```

## 🧠 Improving Intelligence
The "Brain" of Vanguard lives in `lib/threats.json` and the `VanguardScanner` system instructions.
- If you find a bypass, please submit a PR with an updated prompt or threat signature.
- Specify which model you tested with (e.g., Gemini 2.0, Qwen 2.5 7B).

## 🐛 Submitting Issues
- Found a bug? Use our **Bug Report** template.
- Have an idea? Use our **Feature Request** template.
- **IMPORTANT**: If you discover a critical exploit, do NOT open a public issue. See [SECURITY.md](SECURITY.md).

---
☕ Support the research: [Buy Me a Coffee](https://buymeacoffee.com/bazobehram)
