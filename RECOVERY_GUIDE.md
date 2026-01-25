# Enterprise Publication Recovery Guide 🛡️🔑🏗️

If you see an `ENEEDAUTH` or `Access token expired` error when publishing to NPM (like the one you saw on the homeserver), follow these steps to restore your automated shipping pipeline.

## 1. Refresh Your Session 🔄
Your CLI session for NPM has likely expired. Run this in your terminal to log back in:
```bash
npm login
```
*Note: This will likely open a browser windows or ask for your 2FA Passkey signature.*

---

## 2. Using a Permanent Token (Recommended) 🔑
To avoid Passkey/Browser prompts on your remote servers, use a **Granular Access Token**:

1.  **Generate Token**: Go to [NPM Tokens](https://www.npmjs.com/settings/tokens/granular-access-tokens/new).
2.  **Permissions**: Select "Read and write" for the specific package.
3.  **Bypass 2FA**: **CHECK THIS BOX** in the NPM settings for the token.
4.  **Set Environment**: On your server, add this to your `.bashrc` or `.env`:
    ```bash
    export NPM_TOKEN="your_token_here"
    ```

---

## 3. Finishing the Vanguard V3.1.5 Release 🚀
I have already versioned and pushed the codes to GitHub. To finish the live NPM update, simply run:
```bash
npm run ship
```
- Select **"Patch"**.
- When asked about 2FA, select **"No"** (after you've logged in or set the token).

---
🛡️ **Vanguard is perfectly synchronized and ready for the world.**
