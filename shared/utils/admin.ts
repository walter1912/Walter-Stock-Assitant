const API_VERSION = "2026-07";

export class AdminApiError extends Error {}

/**
 * Direct API access: calls from an App Home UI extension to
 * shopify:admin are authenticated for us, so there is no token to manage.
 */
export async function adminQuery<T = any>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`shopify:admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new AdminApiError(`Admin API returned ${response.status}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new AdminApiError(json.errors[0].message ?? "Admin API error");
  }

  return json.data as T;
}

/** userErrors are returned in the payload, not thrown, so surface them. */
export function throwUserErrors(
  payload: { userErrors?: { field?: string[] | null; message: string }[] } | null,
): void {
  const first = payload?.userErrors?.[0];
  if (first) {
    throw new AdminApiError(first.message);
  }
}
