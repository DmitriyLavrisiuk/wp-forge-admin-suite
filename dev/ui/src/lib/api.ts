type ForgeAdminSuiteConfig = {
  restUrl: string;
  nonce: string;
};

function getConfig() {
  return (window.forgeAdminSuite ?? null) as ForgeAdminSuiteConfig | null;
}

export async function apiGet<T>(path: string): Promise<T> {
  const config = getConfig();

  if (!config) {
    throw new Error("Forge admin suite config missing.");
  }

  const normalizedPath = path.replace(/^\//, "");
  const res = await fetch(`${config.restUrl}${normalizedPath}`, {
    headers: {
      "X-WP-Nonce": config.nonce,
    },
  });

  if (!res.ok) {
    const message = res.statusText
      ? `Request failed: ${res.status} ${res.statusText}.`
      : `Request failed: ${res.status}.`;
    throw new Error(message);
  }

  return (await res.json()) as T;
}
