const API_VERSION = "2026-07";

export class AdminApiError extends Error {}

export type AdminQueryFn = (
  query: string,
  variables?: Record<string, unknown>,
) => Promise<any>;

/**
 * Direct API access for Sidekick / admin extensions.
 * The iframe Remix app uses createAdminQuery() with a session.
 */
export const adminQuery: AdminQueryFn = async (query, variables) => {
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

  return json.data;
};

/** userErrors are returned in the payload, not thrown, so surface them. */
export function throwUserErrors(
  payload: { userErrors?: { field?: string[] | null; message: string }[] } | null,
): void {
  const first = payload?.userErrors?.[0];
  if (first) {
    throw new AdminApiError(first.message);
  }
}
