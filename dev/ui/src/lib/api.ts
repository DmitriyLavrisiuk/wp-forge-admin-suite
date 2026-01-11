type ForgeAdminSuiteConfig = {
  restUrl: string;
  nonce: string;
};

function buildUrl(restUrl: string, path: string) {
  const normalizedPath = path.replace(/^\//, "");
  const [pathPart, queryPart] = normalizedPath.split("?");
  const url = new URL(restUrl);

  // Support rest_route query mode for sites without pretty permalinks.
  if (url.searchParams.has("rest_route")) {
    url.searchParams.set("rest_route", `/${pathPart}`);
  } else {
    const basePath = url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;
    url.pathname = `${basePath}/${pathPart}`;
  }

  if (queryPart) {
    const extraParams = new URLSearchParams(queryPart);
    extraParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
}

function getConfig() {
  return (window.forgeAdminSuite ?? null) as ForgeAdminSuiteConfig | null;
}

export async function apiGet<T>(path: string): Promise<T> {
  const config = getConfig();

  if (!config) {
    throw new Error("Forge admin suite config missing.");
  }

  const res = await fetch(buildUrl(config.restUrl, path), {
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

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const config = getConfig();

  if (!config) {
    throw new Error("Forge admin suite config missing.");
  }

  const res = await fetch(buildUrl(config.restUrl, path), {
    method: "POST",
    headers: {
      "X-WP-Nonce": config.nonce,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = res.statusText
      ? `Request failed: ${res.status} ${res.statusText}.`
      : `Request failed: ${res.status}.`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) {
        message = data.message;
      }
    } catch (error) {
      console.error(error);
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function apiDelete(path: string): Promise<void> {
  const config = getConfig();

  if (!config) {
    throw new Error("Forge admin suite config missing.");
  }

  const res = await fetch(buildUrl(config.restUrl, path), {
    method: "DELETE",
    headers: {
      "X-WP-Nonce": config.nonce,
    },
  });

  if (!res.ok) {
    let message = res.statusText
      ? `Request failed: ${res.status} ${res.statusText}.`
      : `Request failed: ${res.status}.`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) {
        message = data.message;
      }
    } catch (error) {
      console.error(error);
    }
    throw new Error(message);
  }
}
