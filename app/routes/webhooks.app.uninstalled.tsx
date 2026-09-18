import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { deleteSessionsForShop } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  if (session) {
    await deleteSessionsForShop(shop);
  }

  return new Response();
};
