import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { login } from "../../shopify.server";

// App Store 2.3.1: no shop-domain form. login() still starts OAuth when
// Shopify sends ?shop=…; otherwise send the merchant to the landing page,
// which tells them to open the app from Shopify admin.
// (shopify-app-react-router 2.x+ no longer supports <AppProvider embedded={false}>.)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await login(request);
  throw redirect("/");
};
