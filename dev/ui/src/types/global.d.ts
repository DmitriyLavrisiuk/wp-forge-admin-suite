declare global {
  interface Window {
    forgeAdminSuite?: {
      restUrl: string;
      nonce: string;
      pluginUrl: string;
      version: string;
    };
  }
}

export {};
