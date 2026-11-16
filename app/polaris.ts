// shopify-app-react-router 4.x loads Polaris web components 2.x by default.
// Pin 1.x so the UI and @shopify/polaris-types stay in sync. Used by both
// AppProvider (script tag) and shopifyApp (preload Link header); keep them equal.
export const POLARIS_URL = "https://cdn.shopify.com/shopifycloud/polaris-1.js";
