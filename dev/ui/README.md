# UI Setup

When pnpm blocks build scripts (e.g., esbuild, msw) during install, approve the builds first:

1. Run `pnpm -C dev/ui approve-builds` and approve esbuild, msw (and any other required packages).
2. Re-run `pnpm -C dev/ui install`.
3. Run `pnpm -C dev/ui build`.

This is pnpm's security feature that blocks postinstall scripts by default. It is safe to approve esbuild for Vite builds.
TODO: If msw is not needed for this project, remove it later once the shadcn CLI dependency chain is verified.
