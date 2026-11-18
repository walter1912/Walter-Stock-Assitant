// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import TaskPage from "../../app/routes/app.task.$id";
import InboxPage from "../../app/routes/app._index";
import SettingsPage from "../../app/routes/app.settings";
import WeeklyReviewPage from "../../app/routes/app.weekly-review";
import Privacy from "../../app/routes/privacy";
import Help from "../../app/routes/help";
import { render } from "@testing-library/react";
import { appData, TASKS } from "../fixtures";
import { gidToId } from "../../shared/utils/gid";
import { clickEveryButton, expectNoCrash, renderPage, touchEveryField } from "./render";

afterEach(cleanup);

// Shopify pattern: no Save button on the page; App Bridge's save bar appears on change.
function expectSaveBarForm() {
  const form = document.querySelector("form");
  expect(form?.hasAttribute("data-save-bar")).toBe(true);
  expect(document.querySelector('s-button[type="submit"]')).toBeNull();
  expect(form?.querySelector("[required]")).toBeNull();
}

const heading = (tag: string) => document.querySelector(tag)?.getAttribute("heading");

// Fail on React warnings/errors (e.g. uncaught render errors) instead of hiding them.
const consoleError = vi.spyOn(console, "error");
afterEach(() => {
  const calls = consoleError.mock.calls.filter((c) => !String(c[0]).includes("is unrecognized in this browser"));
  consoleError.mockClear();
  expect(calls).toEqual([]);
});

const taskLoader = ({ params }: any) => ({ id: params.id });

describe("Task page: every task in the fixture", () => {
  it.each(TASKS.map((t) => [gidToId(t.variantId), t.displayTitle]))("task %s opens, edits and saves", async (id, title) => {
    await renderPage(TaskPage, `/app/task/${id}`, "task/:id", appData(), taskLoader);
    expect(heading("s-page")).toBe(title);
    expectSaveBarForm();
    expect(await touchEveryField("Mai")).toBeGreaterThanOrEqual(3);
    await clickEveryButton();
    expectNoCrash();
  });

  it("unknown id shows 'Task not found' instead of an error", async () => {
    await renderPage(TaskPage, "/app/task/999999", "task/:id", appData(), taskLoader);
    expect(heading("s-banner")).toBe("This task is no longer in your inbox");
    expectNoCrash();
  });
});

describe("Inbox", () => {
  it.each([false, true])("simpleMode=%s: filters and buttons work", async (simpleMode) => {
    await renderPage(InboxPage, "/app", "", appData({ simpleMode }));
    expect(await touchEveryField("snow")).toBeGreaterThanOrEqual(4);
    await clickEveryButton();
    expectNoCrash();
  });

  it("empty store shows the empty state", async () => {
    await renderPage(InboxPage, "/app", "", appData({}, []));
    screen.getByText("Nothing is running low");
    expectNoCrash();
  });
});

describe("Settings", () => {
  it("all fields can be edited", async () => {
    await renderPage(SettingsPage, "/app/settings", "settings");
    expectSaveBarForm();
    expect(await touchEveryField("3")).toBe(5);
    await clickEveryButton();
    expectNoCrash();
  });
});

describe("Weekly review", () => {
  it.each([[TASKS], [[]]])("renders with %#", async (tasks) => {
    await renderPage(WeeklyReviewPage, "/app/weekly-review", "weekly-review", appData({ contactEmail: "a@b.co" }, tasks));
    expect(heading("s-page")).toBe("Weekly review");
    expectNoCrash();
  });
});

describe("Public pages", () => {
  it("privacy and help render", () => {
    render(<Privacy />);
    screen.getByText("Data the app reads from your store");
    cleanup();
    render(<Help />);
    screen.getByText("Frequently asked questions");
  });
});
