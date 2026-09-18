import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function Landing() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Walter stock assistant</h1>
        <p className={styles.text}>
          A low-stock task inbox for Shopify admin. Open the app from your
          store&apos;s Apps menu after installing.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
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
