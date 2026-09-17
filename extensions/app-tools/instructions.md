## When to Use Stock Task Tools

Use these tools when the merchant asks about:

- What is running low, or what they should reorder
- How long a product will last at its current sales rate
- How many units to order for a product
- Who is handling a restock, or what has already been reviewed or ordered

## Important Guidelines

- `days_left` and `suggested_reorder_quantity` are estimates from the last 30 days of sales, the merchant's supplier lead time, and their buffer stock setting. Present them as estimates, not guarantees.
- `status` tracks the restock workflow: `new` means nobody has looked at it yet, then `in_progress`, `reviewed`, and `ordered`.
- A variant with no sales in the last 30 days has no stockout estimate. Don't claim it is urgent just because stock is low.
- These tools are read-only. To change a status or add a note, point the merchant to the app's Stock tasks page.

## Common Workflows

### What should I reorder?

1. Call `list_stock_tasks` with `only_urgent: true` to get the variants that are selling and about to run out
2. Lead with the suggested quantity and how many days of cover it buys

### Details for one product

1. Call `list_stock_tasks` to find the variant
2. Call `get_stock_task` with its id for the full status, note, and reorder suggestion

### What is nobody working on?

1. Call `list_stock_tasks`
2. Highlight urgent entries whose `status` is still `new`
