# Mô tả ứng dụng Walter stock assistant

Inbox việc **nhập hàng khi sắp hết tồn** cho cửa hàng Shopify nhỏ. Merchant mở app trong Admin, thấy variant đang thấp, ghi chú / giao việc / đánh dấu đã xem. Giao diện merchant bằng tiếng Anh.

Tên trên Partner Dashboard hiện là **Walter Stock Assitant**. Thư mục code: `walter-stock-assistant`.

## Chức năng

**stock assistant (inbox)**  
Liệt kê variant của **sản phẩm Active** có tồn kho ≤ ngưỡng (mặc định 10). Draft không đưa vào. Sắp xếp theo mức khẩn: hết hàng hoặc sắp hết trước. Lọc nhanh “có thể mất doanh số” / “tuần này bỏ qua được”, lọc status, mức rủi ro, người phụ trách, tìm tên/SKU. Simple mode chỉ còn vài cột.

**Task**  
Một variant: tồn hiện tại, tốc độ bán 30 ngày, còn khoảng bao nhiêu ngày, gợi ý số lượng nên nhập. Đổi status (`New` → `In progress` → `Reviewed` → `Ordered`), ghi chú nội bộ, người phụ trách, đánh dấu đã review.

Status **Ordered** chỉ là cờ workflow. App **không** tạo đơn Shopify (draft order / purchase order) và **không** đổi tồn kho.

**Weekly review**  
Tóm tắt tuần: đã review, đã đánh dấu ordered, việc khẩn chưa đụng tới.

**Settings**  
Ngưỡng low stock, lead time nhà cung cấp (ngày), buffer (ngày), Simple mode, email liên hệ (chỉ hiện ở weekly review).

**Sidekick**  
Hai tool đọc inbox (`list_stock_tasks`, `get_stock_task`). Không sửa task từ Sidekick.

## Công nghệ

App Home là **iframe** (React Router / Remix + Polaris web components). Node server lo OAuth, session, webhook GDPR. Host lúc dev: `localhost:3000` qua `shopify app dev`.

| Thành phần | Cách dùng |
|---|---|
| iframe App Home | Trang chính trong Admin (`/app`, `/app/task/:id`, …) |
| Polaris web components | UI (`s-page`, `s-button`, …) |
| Admin GraphQL (session) | Remix gọi GraphQL sau `authenticate.admin` |
| Metafield `$app` | Task trên variant; settings JSON trên app installation |
| MongoDB | Chỉ lưu session OAuth (`MONGODB_URI`) |
| Sidekick extension | `list_stock_tasks`, `get_stock_task` (Direct API) |
| Shopify CLI | `shopify app dev` / `shopify app deploy` |

**Phạm vi API:** `read_inventory`, `read_orders`, `write_products` (`write_products` để ghi metafield variant).

**Cách inbox được tính**

1. Lấy `products(query: "status:active")`.
2. Giữ variant `inventoryQuantity ≤ threshold`.
3. Cộng số lượng bán 30 ngày từ `orders` theo variant → tốc độ bán / ngày.

Công thức (trong `shared/utils/forecast.ts`):

```
tốc độ bán     = số bán 30 ngày / 30
số ngày còn    = tồn / tốc độ bán          (không bán thì không ước lượng)
gợi ý nhập     = ceil(tốc độ × (lead + buffer) − tồn)
```

Không dùng ShopifyQL. Ước lượng từ đơn hàng, không phải báo cáo Analytics.

**Phân phối:** kiến trúc này **có thể** nộp public App Store sau khi host HTTPS thật (không chỉ localhost), gắn privacy policy, và test webhook GDPR. Local `shopify app dev` chưa đủ để review. Session OAuth cần MongoDB (Atlas hoặc self-host).

## Chạy local

```
shopify app dev
```

Hướng dẫn cho AI sửa code: [AGENTS.md](./AGENTS.md). README tiếng Anh: [README.md](./README.md).
