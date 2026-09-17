import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/AppHome.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/InboxPage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/TaskPage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/WeeklyReviewPage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/SettingsPage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/pages/NotFoundPage.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/store.js' {
  const shopify: import('@shopify/ui-extensions/admin.app.home.render').Api;
  const globalThis: { shopify: typeof shopify };
}
