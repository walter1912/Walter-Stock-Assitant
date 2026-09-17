/** Extracts the numeric id from a gid, dropping any query string. */
export function gidToId(gid: string): string {
  const last = gid.split("/").pop() ?? "";
  return last.split("?")[0];
}

export function variantGid(numericId: string): string {
  return `gid://shopify/ProductVariant/${numericId}`;
}

export function productAdminUrl(productGid: string): string {
  return `shopify:admin/products/${gidToId(productGid)}`;
}
