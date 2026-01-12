# Codex Rules for forge-admin-suite

## Role
- Act as an implementation assistant for this WordPress plugin with a fixed structure.
- Default operating mode: STRICT.

## Modes (optional guidance)
- STRICT (default): step-by-step, smallest safe change set, prioritize correctness and WP standards.
- BALANCED: keep scope tight but allow minor refactors to improve clarity.
- FAST: minimal viable changes, defer non-critical cleanup.

## Project Structure
- Do NOT change the fixed folder structure unless explicitly instructed.
- Keep changes minimal and focused per task.

## WordPress Coding Standards
- Follow WordPress Coding Standards in all PHP.
- Include PHPDoc blocks in every PHP file and for all classes and methods.
- Add `ABSPATH` guards in every PHP file.

## Security Requirements
- Sanitize all inputs and escape all outputs.
- REST endpoints must use `permission_callback` requiring `manage_options` and validate `X-WP-Nonce` via WordPress REST auth (`wp_rest`).

## Assets and Vite Rules
- UI source lives in `dev/ui`.
- PROD: use `ui/dist/.vite/manifest.json` with multi-entry keys:
  - `src/main.tsx` (admin)
  - `src/frontend.ts` (frontend)
- DEV: use Vite dev server ESM modules with `type="module"` and no `?ver` on module URLs.
- Inject React Refresh preamble manually (WP does not use Vite `index.html`).
- Detect and store Vite origin in transient `forge_admin_suite_vite_origin`.
- Allow force recheck via `?forge_recheck_vite=1`.

## Enqueue Rules
- Enqueue scripts/styles only on the plugin admin page.
- If manifest/assets are missing, do not fatal; show an admin notice instead.

## Output policy
- Default response MUST include:
  - Short summary (max ~6 bullets)
  - Changed files list
  - Unified git diff
- Never output full file contents unless explicitly asked.
- If total diff is large (e.g. > 250 lines), DO NOT print the full diff; instead output:
  - Changed files list
  - `git diff --stat`
  - Concise per-file summary
  - Exact local commands to inspect details (`git diff`, `git show`, `git diff <file>`).

## UI components rule
- All form/controls must use shadcn/ui components (Button, Input, Select, Checkbox, Switch, RadioGroup, Textarea, Label, Tooltip, Dialog, DropdownMenu, etc.).
- Do not use native `<select>` or custom-built form controls in pages/features; only via `src/components/ui` (shadcn).
- If a needed shadcn component is missing, add it under `src/components/ui` following shadcn patterns.

## Output Requirements
- When asked to change code, output only: (1) list of changed files and (2) unified git diff.
- Do not print full file contents or additional sections.

## Response Format
- Output only the changed files list followed by the unified git diff.

## Versioning & Release Management
- The assistant owns semantic versioning (SemVer) for this plugin.
- Each development step must state: current version, whether it is potentially release-ready, and what remains to complete it.
- Bump rules: PATCH for fixes/internal changes; MINOR for new backward-compatible features; MAJOR for breaking changes.
- When release-ready, instruct to:
  - Create branch `release/vX.Y.Z`, open PR, merge, tag `vX.Y.Z`, delete branch.
  - Update versions in: WP header + version constant, `readme.txt` Stable tag, `dev/ui/package.json`, `README.md`, `CHANGELOG.md`.

## Workflow Requirements
- Always work step-by-step; never assume.
- Always run: PHP lint, and pnpm build for `dev/ui` if touched.
- Never modify global `~/.codex/config.toml`; only project `.codex/config.toml`.
- Respect the fixed folder structure from instructions.

## Git Hygiene
- Keep changes minimal and focused per task.

## Output rules
ABSOLUTE OUTPUT BAN — BUILD ARTIFACTS:
- Never print or include the contents of any files under:
  - ui/dist/assets/**
  - ui/dist/.vite/**
- If these files change, only report them via `git diff --stat` and a one-line note like "Build artifact updated".
- Do not include unified diff hunks for these paths.
- Do not paste base64, minified JS/CSS, or large generated bundles in the response.
RESPONSE FORMATTING (STRICT):
- Always output in this order:
  1) "Changed files:" as a plain bullet list (no code).
  2) "Diff:" as a SINGLE fenced code block using ```diff ... ``` (or ``` for non-diff).
  3) "Notes:" as plain text.
- Never print diff hunks outside a fenced code block.
- Never include lines starting with @@, diff --git, +++, ---, +, - outside a fenced block.
- Never mix JSX/TSX snippets into plain text; wrap them in ```tsx``` blocks.
- If the diff is large: output ONLY `git diff --stat` and a short summary (no hunks).
