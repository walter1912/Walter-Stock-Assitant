# App Tools

This extension registers headless data tools for Sidekick (`admin.app.tools.data`).

## Tools

- **`list_stock_tasks`** — Returns the low stock task inbox as resource links, most urgent first. Pass `only_urgent: true` for the variants that are selling and about to run out.
- **`get_stock_task`** — Returns the stock task for a single product variant

Both tools are read-only. Changing a status or adding a note happens on the app's Stock tasks page.

## Get started

After your extension is deployed and installed in a development store, Sidekick can call these tools when a merchant asks what is running low or how much to reorder.
