import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { loadAuthenticatedInbox, type AppData } from "../inbox.server";

export const loader = async ({ request }: LoaderFunctionArgs): Promise<AppData> => {
  const { settings, inbox } = await loadAuthenticatedInbox(request);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    settings,
    inbox,
  };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">stock assistant</s-link>
        <s-link href="/app/weekly-review">Weekly review</s-link>
        <s-link href="/app/settings">Settings</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
