# Forge Admin Suite

WordPress plugin scaffold for a React-powered admin page using Vite and Tailwind.

## Development
- UI source: `dev/ui`
- Production build output: `ui/dist`

### Commands
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`

### UI Setup
- If pnpm blocks build scripts, run `pnpm -C dev/ui approve-builds`, approve esbuild, then re-run install/build. This is pnpm's security gate for postinstall scripts; esbuild is safe for Vite.

### Notes
- Admin UI loads only on the plugin admin page.
- REST API namespace: `forge-admin-suite/v1`.
