/// <reference types="vite/client" />

declare module "/@react-refresh" {
  const RefreshRuntime: {
    injectIntoGlobalHook: (win: Window) => void;
  };
  export default RefreshRuntime;
}

declare global {
  interface Window {
    $RefreshReg$?: (type: unknown, id: string) => void;
    $RefreshSig$?: () => (type: unknown) => unknown;
    __vite_plugin_react_preamble_installed__?: boolean;
  }
}
