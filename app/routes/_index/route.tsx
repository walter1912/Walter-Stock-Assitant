import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import styles from "./styles.module.css";

// App Store 2.3.1: no manual shop-domain entry. Installs start from Shopify only.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function Landing() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Walter stock assistant</h1>
        <p className={styles.text}>
          A low-stock task inbox for Shopify admin. Open the app from your
          store&apos;s Apps menu after installing.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Inbox.</strong> Active products at or below your threshold,
            ranked by how soon they run out.
          </li>
          <li>
            <strong>Tasks.</strong> Status, owner, and an internal note on each
            variant. Ordered is a workflow flag only.
          </li>
          <li>
            <strong>Weekly review.</strong> A one-page summary of what was
            reviewed, ordered, or still untouched.
          </li>
        </ul>
      </div>
    </div>
  );
}
