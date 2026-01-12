# Forge Admin Suite

WordPress plugin scaffold for a React-powered admin page using Vite and Tailwind.
Current version: 0.1.13

## Development
- UI source: `dev/ui`
- Production build output: `ui/dist`

### Commands
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`

### UI Setup
- If pnpm blocks build scripts, run `pnpm -C dev/ui approve-builds`, approve esbuild and msw (and any other listed packages), then re-run install/build. This is pnpm's security gate for postinstall scripts; esbuild is safe for Vite.

### Versioning
- Update version in `FORGE_ADMIN_SUITE_VERSION` and the plugin header in `forge-admin-suite.php`.
- Keep `readme.txt`, `CHANGELOG.md`, and `dev/ui/package.json` in sync.

### Notes
- Admin UI loads only on the plugin admin page.
- REST API namespace: `forge-admin-suite/v1`.
