import type { MetaFunction } from "react-router";

import { APP_NAME, PublicPage, SUPPORT_EMAIL } from "../public-page";

export const meta: MetaFunction = () => [{ title: `Help · ${APP_NAME}` }];

export default function Help() {
  return (
    <PublicPage title="Help and FAQ">
      <h2>Getting started</h2>
      <ol>
        <li>Install the app and open it from the Apps menu in your Shopify admin.</li>
        <li>
          Go to Settings and set your low stock threshold, supplier lead time,
          and buffer days. Save to recalculate your inbox.
        </li>
        <li>
          Work through the inbox. Open an item to set a status, owner, and
          note, or click Mark reviewed.
        </li>
        <li>Use Weekly review to see what was handled and what still needs attention.</li>
      </ol>

      <h2>Frequently asked questions</h2>

      <h3>Why is a product missing from my inbox?</h3>
      <p>
        Only active products appear. Draft and archived products are skipped.
        A variant appears when its inventory is at or below your threshold.
      </p>

      <h3>How is “Runs out in” calculated?</h3>
      <p>
        Units sold in the last 30 days are divided by 30 to get sales per day.
        Stock on hand is then divided by sales per day.
      </p>

      <h3>Why does an item say “Not selling” or “No sales yet”?</h3>
      <p>
        The variant had no sales in the last 30 days, so the app cannot
        estimate when it will run out or how many to order.
      </p>

      <h3>How is the suggested order quantity worked out?</h3>
      <p>
        Sales per day × (lead time + buffer days) − stock on hand, rounded up.
        Change lead time and buffer days in Settings.
      </p>

      <h3>Does marking an item “Ordered” place an order with my supplier?</h3>
      <p>
        No. Ordered is a status to help your team track work. The app does not
        create purchase orders or contact suppliers.
      </p>

      <h3>Does the app change my inventory?</h3>
      <p>No. The app only reads inventory. It never changes stock levels.</p>

      <h3>What is Simple mode?</h3>
      <p>Simple mode shows only the product, days left, and how many to order.</p>

      <h2>Contact support</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and include
        your store’s myshopify.com address so we can help faster.
      </p>
    </PublicPage>
  );
}
