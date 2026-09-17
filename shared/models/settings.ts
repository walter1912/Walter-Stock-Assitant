import { adminQuery, throwUserErrors } from "../utils/admin";

/**
 * Settings the merchant fills in once. Stored as a single app-owned metafield
 * on the app installation, so every staff member sees the same values
 * (browser storage would be per-device).
 */
export interface Settings {
  /** Variants at or below this quantity enter the inbox. */
  threshold: number;
  /** Days between placing an order and receiving it. */
  leadTimeDays: number;
  /** Extra days of stock to keep as a buffer. */
  safetyDays: number;
  /** Show only Product / Days left / Order this many. */
  simpleMode: boolean;
  /** Who to chase about restocks. Shown in the weekly review only. */
  contactEmail: string;
}

export const DEFAULT_SETTINGS: Settings = {
  threshold: 10,
  leadTimeDays: 7,
  safetyDays: 7,
  simpleMode: false,
  contactEmail: "",
};

const SETTINGS_QUERY = `#graphql
  query StockTaskSettings {
    currentAppInstallation {
      id
      metafield(namespace: "$app", key: "settings") {
        value
      }
    }
  }`;

const SETTINGS_MUTATION = `#graphql
  mutation SaveStockTaskSettings($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
      }
      userErrors {
        field
        message
      }
    }
  }`;

function coerce(raw: unknown): Settings {
  const parsed = (raw ?? {}) as Partial<Settings>;
  const positive = (value: unknown, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  return {
    threshold: positive(parsed.threshold, DEFAULT_SETTINGS.threshold),
    leadTimeDays: positive(parsed.leadTimeDays, DEFAULT_SETTINGS.leadTimeDays),
    safetyDays: positive(parsed.safetyDays, DEFAULT_SETTINGS.safetyDays),
    simpleMode: Boolean(parsed.simpleMode),
    contactEmail: typeof parsed.contactEmail === "string" ? parsed.contactEmail : "",
  };
}

let installationId: string | null = null;

export async function fetchSettings(): Promise<Settings> {
  const data = await adminQuery(SETTINGS_QUERY);
  installationId = data.currentAppInstallation?.id ?? null;

  const raw = data.currentAppInstallation?.metafield?.value;
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    return coerce(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!installationId) {
    // Saving before the first read: resolve the owner id first.
    await fetchSettings();
  }
  if (!installationId) {
    throw new Error("Could not resolve the app installation");
  }

  const data = await adminQuery(SETTINGS_MUTATION, {
    metafields: [
      {
        ownerId: installationId,
        namespace: "$app",
        key: "settings",
        type: "json",
        value: JSON.stringify(coerce(settings)),
      },
    ],
  });

  throwUserErrors(data.metafieldsSet);
}
