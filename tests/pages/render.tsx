// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { createRoutesStub, useRouteError } from "react-router";
import type { ComponentType } from "react";
import { expect } from "vitest";
import { appData } from "../fixtures";

function Crash() {
  const error = useRouteError() as Error;
  return <div data-testid="crash">{String(error?.message ?? error)}</div>;
}

/** Render a page under a fake "routes/app" parent, like the real app shell. */
export async function renderPage(
  Page: ComponentType,
  url: string,
  path: string,
  data = appData(),
  loader?: (args: any) => unknown,
) {
  const Stub = createRoutesStub([
    {
      id: "routes/app",
      path: "/app",
      loader: () => data,
      ErrorBoundary: Crash,
      children: [
        { path, Component: Page, loader, ErrorBoundary: Crash, action: () => ({ ok: true }) },
      ],
    },
  ]);
  render(<Stub initialEntries={[url]} />);
  await screen.findByText((_, el) => el?.tagName === "S-PAGE");
}

const FIELDS = "s-text-field, s-text-area, s-number-field, s-email-field, s-search-field, s-select, s-switch, s-checkbox";

/**
 * Type into every field and toggle every switch, the way a reviewer would.
 * React clears event.currentTarget after the handler returns, so any handler
 * that reads it lazily (the 2.1.1 bug) crashes here.
 */
export async function touchEveryField(value = "7") {
  const fields = Array.from(document.querySelectorAll<HTMLElement & { value?: string; checked?: boolean }>(FIELDS));
  for (const field of fields) {
    await act(async () => {
      if (field.tagName === "S-SWITCH" || field.tagName === "S-CHECKBOX") field.checked = !field.checked;
      else if (field.tagName === "S-SELECT") field.value = field.querySelector("s-option:last-child")?.getAttribute("value") ?? "";
      else field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  return fields.length;
}

export async function clickEveryButton() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>("s-button:not([href]):not([type])"));
  for (const button of buttons) {
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }
  return buttons.length;
}

export function expectNoCrash() {
  expect(screen.queryByTestId("crash")?.textContent ?? null).toBeNull();
}
