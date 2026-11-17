import type { CSSProperties, ReactNode } from "react";

/**
 * Public pages (privacy policy, help) linked from the App Store listing.
 * No auth, no App Bridge, no Polaris: plain HTML so they load anywhere.
 */

// TODO: replace with the support email shown on your App Store listing.
export const SUPPORT_EMAIL = "walter.thaiho@gmail.com";
export const APP_NAME = "Walter Stock Assistant";
export const LAST_UPDATED = "November 17, 2026";

const wrap: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "40px 16px 64px",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  lineHeight: 1.6,
  color: "#303030",
};

export function PublicPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>{title}</h1>
      <p style={{ color: "#616161", marginTop: 0 }}>
        {APP_NAME} · Last updated {LAST_UPDATED}
      </p>
      {children}
      <hr style={{ margin: "40px 0 16px", border: 0, borderTop: "1px solid #e3e3e3" }} />
      <p style={{ color: "#616161", fontSize: 14 }}>
        <a href="/privacy">Privacy policy</a> · <a href="/help">Help</a> ·{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </main>
  );
}
