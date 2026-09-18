import type { Inbox } from "../shared/models/stockTasks";
import type { Settings } from "../shared/models/settings";
import { fetchSettings } from "../shared/models/settings";
import { loadInbox } from "../shared/models/stockTasks";
import { createAdminQuery } from "./admin-query.server";
import { authenticate } from "./shopify.server";

export type AppData = {
  apiKey: string;
  settings: Settings;
  inbox: Inbox;
};

export async function authenticatedQuery(request: Request) {
  const { admin } = await authenticate.admin(request);
  const query = createAdminQuery(admin.graphql);
  return { admin, query };
}

export async function loadAuthenticatedInbox(request: Request) {
  const { admin, query } = await authenticatedQuery(request);
  const settings = await fetchSettings(query);
  const inbox = await loadInbox(settings, query);
  return { admin, query, settings, inbox };
}
