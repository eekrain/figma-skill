# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when using figma-skill.

## Quick Diagnostics Checklist

Before diving into specific issues, verify these basics:

1. **Working Directory** - Are you running from the output directory?
2. **.env File** - Does `.env` exist with a valid `FIGMA_TOKEN`?
3. **Node Modules** - Have you run `bun install`?
4. **System Libraries** - Are required system libraries available (NixOS users)?

Run this quick check:

```bash
# From output directory (.claude/figma-outputs/YYYY-MM-DD-name/)
ls ../../.env          # Should show .env file
grep FIGMA_TOKEN ../../.env  # Should show token value
ls node_modules/figma-skill # Should show package is installed
pwd                    # Should show you're in output directory
```

---

## System-Specific Issues

### NixOS/nix-ld Setup

**Symptom:**

```
Error: libstdc++.so.6: cannot open shared object file: No such file or directory
```

**Cause:**
The `sharp` package (image processing dependency of figma-skill) requires native system libraries that aren't available by default on NixOS.

**Solution:**
Configure `nix-ld` in your NixOS configuration:

```nix
# /etc/nixos/configuration.nix
programs.nix-ld = {
  enable = true;
  libraries = with pkgs; [
    gcc.cc.lib  # provides libstdc++.so.6
  ];
};
```

Then rebuild your system:

```bash
sudo nixos-rebuild switch
```

**Verification:**

```bash
# After rebuild, verify the library is available
ls $LD_LIBRARY_PATH | grep libstdc++
```

---

## Figma API Issues

### Rate Limiting (429 Errors)

**Symptom:**

```
Rate limited! Retry-After: 165479, delay: 165479000ms
```

**Cause:**
Figma API rate limits requests. Occasionally returns extremely high (incorrect) `Retry-After` values.

**Solutions:**

1. **Wait and Retry** - The actual rate limit is usually 1-2 minutes, regardless of what the header says.

2. **Reduce Concurrency** - Lower concurrent requests:

   ```typescript
   const figma = new FigmaExtractor({
     token,
     concurrent: 3, // Reduced from default 10
   });
   ```

3. **Add Manual Delay** - Space out requests:
   ```typescript
   for (const { key, name } of files) {
     const design = await figma.getFile(key, { format: "toon" });
     await new Promise((r) => setTimeout(r, 2000)); // 2 second delay
   }
   ```

**Common Rate Limit Triggers:**

- Processing multiple files in quick succession
- High concurrent download counts (use `parallel: 3` for `downloadImages`)
- Frequent retries during development

---

## Development Environment Issues

### Working Directory Errors

**Symptom:**

```
Error: Cannot find module './dist/utils/dotenv'
```

**Cause:**
Running script from project root instead of output directory. The `../../.env` path is relative to the script location.

**Solution:**

```bash
# ❌ Wrong (runs from project root)
cd /home/eekrain/CODE/figma-skill
bun run script.ts

# ✅ Correct (runs from output directory)
cd .claude/figma-outputs/2025-01-22-my-design
bun run script.ts
```

**Debugging:**

```bash
# Check current directory
pwd

# Check where .env should be relative to current directory
ls ../../.env  # Should exist if in output directory
```

### .env File Location

**Expected Location:**
The `.env` file should be at `../../.env` relative to your script.

**Recommended Structure:**

```
figma-skill/                           # Project root
├── .claude/
│   ├── .env                          # ← Place FIGMA_TOKEN here
│   └── figma-outputs/
│       └── 2025-01-22-my-design/      # ← Script runs from here
│           ├── script.ts              # Uses ../../.env
│           ├── package.json
│           └── node_modules/
```

**Valid Token Format:**

```bash
# .claude/.env
FIGMA_TOKEN=figd_your_token_here
```

**Token Sources:**

- Get from: https://www.figma.com/developers/api#authentication
- Format: `figd_` prefix followed by alphanumeric string
- Must have appropriate file permissions

---

## Package-Specific Issues

### Type Errors: nodeId Not in GetFileOptions

**Symptom:**

```
Type error: Object literal may only specify known properties,
and 'nodeId' does not exist in type 'GetFileOptions'
```

**Cause:**
npm package v0.1.0 had outdated type definitions. **Fixed in v0.1.1+** - update to the latest version.

**Solution:**

```bash
bun update figma-skill
```

Update to v0.1.1 or later for correct types.

**Workarounds** (if unable to update):

1. **Use Type Assertion**:

   ```typescript
   const design = await figma.getFile(fileKey, {
     nodeId: "6001-47121",
     format: "json",
   } as any); // Bypass type check temporarily
   ```

2. **Cast Result** (if result type errors):
   ```typescript
   import { SimplifiedDesign } from "figma-skill";

   const design = (await figma.getFile(fileKey, options)) as SimplifiedDesign;
   ```

### ESLint Errors from Parent Project

**Symptom:**

```
ESLint: 'Bun' is not defined. (no-undef)
ESLint: Missing file extension for "./dist/utils/dotenv"
```

**Cause:**
Parent project's ESLint config extends into output scripts.

**Solution:**
Add ignore pattern to parent project's `eslint.config.js`:

```javascript
// eslint.config.js (in project root)
export default [
  {
    ignores: [
      "dist",
      "node_modules",
      "*.config.js",
      ".claude/figma-outputs/**", // ← Add this line
    ],
  },
  // ... rest of config
];
```

**Alternative: Add .eslintrc to output directory**

```bash
# In output directory (.claude/figma-outputs/YYYY-MM-DD-name/)
echo '{"root": true}' > .eslintrc.json
```

---

## FAQ

**Q: Why does rate limiting show 46+ hours wait time?**
A: Figma sometimes returns incorrect `Retry-After` values. The actual rate limit typically resets in 1-2 minutes. Wait briefly and retry.

**Q: Do I need to install libstdc++ manually?**
A: On most systems (macOS, standard Linux), it's already available. On NixOS, use `nix-ld` configuration (see above).

**Q: Where should I put the .env file?**
A: At `.claude/.env` in your project root. Use `../../.env` in your script to reference it.

**Q: Can I run scripts from the project root?**
A: No. Scripts must run from the output directory because they use relative paths like `../../.env`.

**Q: What's the difference between TOON and JSON format?**
A: TOON is 30-60% smaller and optimized for storage. JSON provides full node property access. Use TOON for storage, JSON for processing.

**Q: How do I know if a file is too large?**
A: You don't need to check. figma-skill automatically detects large files (>10K nodes) and switches to paginated fetching.

**Q: Can I use this with npm instead of bun?**
A: No, figma-skill requires Bun for ESM support and runtime features like `Bun.write()`.

---

## Still Having Issues?

1. **Check Token Validity:** Verify your token at https://www.figma.com/developers/api
2. **Check File Access:** Ensure your token has access to the specific Figma file
3. **Review Error Messages:** Look for specific error codes (401, 403, 404, 429, 500)
4. **Check Network:** Ensure you can reach `api.figma.com`
5. **Update Package:** Run `bun update figma-skill`

**Getting Help:**

- Review examples in `references/examples.md`
- Check API docs in `references/api.md`
- See advanced topics in `references/advanced.md`
