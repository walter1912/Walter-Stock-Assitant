import type { MetaFunction } from "react-router";

import { APP_NAME, PublicPage, SUPPORT_EMAIL } from "../public-page";

export const meta: MetaFunction = () => [
  { title: `Privacy policy · ${APP_NAME}` },
];

// Keep this page in sync with what the code actually reads and stores.
export default function Privacy() {
  return (
    <PublicPage title="Privacy policy">
      <p>
        {APP_NAME} (“the app”) helps Shopify merchants find products that are
        running low and plan restocks. This policy explains what data the app
        accesses, what it stores, and how that data is removed.
      </p>

      <h2>Data the app reads from your store</h2>
      <p>When you open the app, it reads the following through the Shopify Admin API:</p>
      <ul>
        <li>Active products and variants: titles, SKUs, and inventory quantities.</li>
        <li>
          Orders from the last 30 days: only the quantity sold for each product
          variant and whether the order was cancelled.
        </li>
      </ul>
      <p>
        The app does not read customer names, email addresses, phone numbers,
        shipping addresses, or payment details. This data is used only to show
        your inbox and is not saved on our servers.
      </p>

      <h2>Data the app stores</h2>
      <ul>
        <li>
          <strong>Inside your Shopify store (metafields):</strong> task status,
          owner, note, and last reviewed date for each variant, plus your app
          settings (stock threshold, lead time, buffer days, simple mode, and an
          optional contact email). You can see and change this data in the app.
        </li>
        <li>
          <strong>On our server:</strong> your shop domain and the access token
          Shopify issues when you install the app, so the app can make API
          requests on your behalf. These sessions are stored in a database
          hosted by MongoDB Atlas.
        </li>
      </ul>

      <h2>How data is used and shared</h2>
      <p>
        Data is used only to provide the app’s features. We do not sell data,
        use it for advertising, or share it with third parties, except the
        hosting providers that run the app (Render for the web server and
        MongoDB Atlas for session storage). The app does not use tracking or
        analytics cookies. The app does not send email.
      </p>

      <h2>Data retention and deletion</h2>
      <ul>
        <li>When you uninstall the app, your stored sessions are deleted from our server.</li>
        <li>
          When Shopify sends a shop data erasure request (48 hours after
          uninstall), any remaining sessions for your shop are deleted.
        </li>
        <li>
          The app does not store customer personal data, so customer data and
          customer erasure requests have nothing to return or delete.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        All traffic to the app uses HTTPS. Requests from Shopify are verified
        with Shopify session tokens and webhook signatures.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </PublicPage>
  );
}
