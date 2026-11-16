import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { deleteSessionsForShop } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  await deleteSessionsForShop(shop);
  return new Response();
};
