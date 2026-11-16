import { useEffect, useState } from "react";
import type { ActionFunctionArgs, HeadersFunction } from "react-router";
import { useFetcher, useRouteLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { saveSettings, type Settings } from "../../shared/models/settings";
import { authenticatedQuery, type AppData } from "../inbox.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { query } = await authenticatedQuery(request);
  const form = await request.formData();

  await saveSettings(
    {
      threshold: Number(form.get("threshold")),
      leadTimeDays: Number(form.get("leadTimeDays")),
      safetyDays: Number(form.get("safetyDays")),
      contactEmail: String(form.get("contactEmail") ?? ""),
      simpleMode: form.get("simpleMode") === "true",
    },
    query,
  );

  return { ok: true };
};

export default function SettingsPage() {
  const { settings } = useRouteLoaderData("routes/app") as AppData;
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const setField = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const number = (raw: string, fallback: number) => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  return (
    <s-page heading="Settings" inlineSize="small">
      <s-link slot="breadcrumb-actions" href="/app">
        stock assistant
      </s-link>

      <s-section heading="What counts as low stock">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            fetcher.submit(
              {
                threshold: String(draft.threshold),
                leadTimeDays: String(draft.leadTimeDays),
                safetyDays: String(draft.safetyDays),
                contactEmail: draft.contactEmail,
                simpleMode: String(draft.simpleMode),
              },
              { method: "POST" },
            );
          }}
          onReset={() => setDraft(settings)}
        >
          <s-stack direction="block" gap="base">
            <s-number-field
              label="Low stock threshold"
              name="threshold"
              labelAccessibilityVisibility="visible"
              min={0}
              value={String(draft.threshold)}
              details="Active products only. Variants at or below this many units show up in your inbox."
              onInput={(event) =>
                setField(
                  "threshold",
                  number(event.currentTarget.value, draft.threshold),
                )
              }
            />
            <s-number-field
              label="Supplier lead time (days)"
              name="leadTimeDays"
              labelAccessibilityVisibility="visible"
              min={0}
              value={String(draft.leadTimeDays)}
              details="How long a restock usually takes to arrive."
              onInput={(event) =>
                setField(
                  "leadTimeDays",
                  number(event.currentTarget.value, draft.leadTimeDays),
                )
              }
            />
            <s-number-field
              label="Buffer stock (days)"
              name="safetyDays"
              labelAccessibilityVisibility="visible"
              min={0}
              value={String(draft.safetyDays)}
              details="Extra days of stock to hold so a late delivery doesn't sell you out."
              onInput={(event) =>
                setField(
                  "safetyDays",
                  number(event.currentTarget.value, draft.safetyDays),
                )
              }
            />
            <s-email-field
              label="Who to chase about restocks"
              name="contactEmail"
              labelAccessibilityVisibility="visible"
              placeholder="you@example.com"
              value={draft.contactEmail}
              details="Shown in the weekly review. The app does not send email."
              onInput={(event) =>
                setField("contactEmail", event.currentTarget.value)
              }
            />
            <s-switch
              label="Simple mode"
              name="simpleMode"
              checked={draft.simpleMode}
              details="Show only the product, days left, and how many to order."
              onChange={(event) =>
                setField("simpleMode", event.currentTarget.checked)
              }
            />
            <s-button-group>
              <s-button
                type="submit"
                variant="primary"
                {...(fetcher.state !== "idle" ? { loading: true } : {})}
              >
                Save
              </s-button>
              <s-button type="reset">Discard</s-button>
            </s-button-group>
          </s-stack>
        </form>
      </s-section>

      <s-section heading="How the suggestion is worked out">
        <s-stack direction="block" gap="small-200">
          <s-paragraph>
            Sales per day comes from the units sold in the last 30 days, divided
            by 30.
          </s-paragraph>
          <s-paragraph>
            Days left is your stock on hand divided by sales per day.
          </s-paragraph>
          <s-paragraph>
            The suggested order covers the lead time plus the buffer, minus what
            you already have: sales per day x ({draft.leadTimeDays} +{" "}
            {draft.safetyDays}) - stock on hand.
          </s-paragraph>
          <s-text color="subdued">
            Saving recalculates your inbox.
          </s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
