import { AdminApiError, type AdminQueryFn } from "../shared/utils/admin";

type GraphqlClient = (
  query: string,
  options?: { variables?: Record<string, unknown> },
) => Promise<Response>;

/** Wrap authenticate.admin().graphql so shared models can reuse adminQuery. */
export function createAdminQuery(graphql: GraphqlClient): AdminQueryFn {
  return async (query: string, variables?: Record<string, unknown>) => {
    const response = await graphql(query, { variables });

    if (!response.ok) {
      throw new AdminApiError(`Admin API returned ${response.status}`);
    }

    const json = await response.json();

    if (json.errors?.length) {
      throw new AdminApiError(json.errors[0].message ?? "Admin API error");
    }

    return json.data;
  };
}
