import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/index.js' {
  interface ListStockTasksInput {
    /**
     * When true, return only the variants that are selling and about to run out
     */
    only_urgent?: boolean;
    /**
     * Maximum number of tasks to return. Defaults to 20.
     */
    limit?: number;
    [k: string]: unknown;
  }

  interface ListStockTasksOutput {
    results?: {
      /**
       * Always 'resource_link'
       */
      type: string;
      /**
       * GID URI of the stock task
       */
      uri: string;
      /**
       * Product and variant name
       */
      name: string;
      /**
       * MIME type for this resource
       */
      mimeType: string;
      /**
       * Stock and workflow details for the variant
       */
      _meta?: {
        /**
         * Variant SKU
         */
        sku?: string;
        /**
         * Workflow status: new, in_progress, reviewed, or ordered
         */
        status?: string;
        /**
         * Who is handling the restock
         */
        owner?: string;
        /**
         * Internal note about this variant
         */
        note?: string;
        /**
         * Units available across all locations
         */
        inventory?: number;
        /**
         * How soon the variant runs out
         */
        urgency?: string;
        /**
         * Average units sold per day
         */
        sales_summary?: string;
        /**
         * Estimated days until stockout
         */
        days_left?: string;
        /**
         * Plain language reorder suggestion
         */
        reorder_summary?: string;
        /**
         * Units to order now
         */
        suggested_reorder_quantity?: number;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    }[];
    [k: string]: unknown;
  }

  interface GetStockTaskInput {
    /**
     * The product variant GID or its numeric id
     */
    id: string;
    [k: string]: unknown;
  }

  interface GetStockTaskOutput {
    results?: {
      /**
       * Always 'resource_link'
       */
      type: string;
      /**
       * GID URI of the stock task
       */
      uri: string;
      /**
       * Product and variant name
       */
      name: string;
      /**
       * MIME type for this resource
       */
      mimeType: string;
      /**
       * Stock and workflow details for the variant
       */
      _meta?: {
        /**
         * Variant SKU
         */
        sku?: string;
        /**
         * Workflow status: new, in_progress, reviewed, or ordered
         */
        status?: string;
        /**
         * Who is handling the restock
         */
        owner?: string;
        /**
         * Internal note about this variant
         */
        note?: string;
        /**
         * Units available across all locations
         */
        inventory?: number;
        /**
         * How soon the variant runs out
         */
        urgency?: string;
        /**
         * Average units sold per day
         */
        sales_summary?: string;
        /**
         * Estimated days until stockout
         */
        days_left?: string;
        /**
         * Plain language reorder suggestion
         */
        reorder_summary?: string;
        /**
         * Units to order now
         */
        suggested_reorder_quantity?: number;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    }[];
    [k: string]: unknown;
  }

  interface ShopifyTools {
    /**
     * List the low stock task inbox, most urgent first, with days left and a suggested reorder quantity for each variant
     */
    register(
      name: 'list_stock_tasks',
      handler: (
        input: ListStockTasksInput,
      ) => ListStockTasksOutput | Promise<ListStockTasksOutput>,
    ): () => void;
    /**
     * Get the stock task for a single product variant, including its workflow status, note, and reorder suggestion
     */
    register(
      name: 'get_stock_task',
      handler: (
        input: GetStockTaskInput,
      ) => GetStockTaskOutput | Promise<GetStockTaskOutput>,
    ): () => void;
  }

  const shopify: import('@shopify/ui-extensions/admin').WithGeneratedTools<
    import('@shopify/ui-extensions/admin.app.tools.data').Api,
    ShopifyTools
  >;
  const globalThis: { shopify: typeof shopify };
}
