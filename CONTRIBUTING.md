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

## 🚀 How to Release
Maintainers can trigger a synchronized release (Version bump, Tags, GitHub Release, Changelog, and NPM) using:

1. **Ensure environment**: You must have a `GITHUB_TOKEN` with `repo` permissions in your shell.
2. **Execute**:
   ```bash
   npm run release
   ```
3. **Dry Run**: To verify changes without side effects:
   ```bash
   npm run release:dry
   ```

---
☕ Support the research: [Buy Me a Coffee](https://buymeacoffee.com/bazobehram)
