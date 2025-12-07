# Stolen Tee Admin Dashboard - System Architecture

## Complete End-to-End Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD                             │
│                       (React Frontend)                              │
│                                                                     │
│  Components:                                                        │
│  ├─ OrderList.tsx         ← Display all orders                     │
│  ├─ OrderDetail.tsx       ← Display single order details           │
│  ├─ OrderStatusUpdater    ← Update production status               │
│  └─ DesignImageViewer     ← Show Gemini-generated designs          │
│                                                                     │
│  Uses: adminAPI from @/services/api                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP Requests
                                    │ Authorization: Bearer {JWT}
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND API SERVICE                            │
│                  /frontend/src/services/api.ts                      │
│                                                                     │
│  export const adminAPI = {                                          │
│    getAllOrders(filters?) → GET /api/admin/orders                  │
│    getOrderById(id)       → GET /api/admin/orders/:id              │
│    updateOrderStatus()    → PATCH /api/admin/orders/:id/status     │
│    addTrackingNumber()    → PATCH /api/admin/orders/:id/status     │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PRODUCTION API (Railway)                               │
│     https://stolentee-backend-production.up.railway.app             │
│                                                                     │
│  Middleware Stack:                                                  │
│  1. authenticate() ─────────────────► Verify JWT token             │
│  2. authorize('admin') ─────────────► Check user.role === 'admin'  │
│  3. Route handler ──────────────────► Process request              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API ROUTES                                       │
│              /backend/src/routes/admin.ts                           │
│                                                                     │
│  router.get('/orders', getAllOrders)                                │
│  router.get('/orders/:id', getOrderById)                            │
│  router.patch('/orders/:id/status', updateOrderStatus)             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 ADMIN CONTROLLER                                    │
│          /backend/src/controllers/adminController.ts                │
│                                                                     │
│  getAllOrders()  ──────────► adminOrderService.getAllOrdersForAdmin │
│  getOrderById()  ──────────► adminOrderService.getOrderByIdForAdmin │
│  updateOrderStatus() ──────► adminOrderService.update...Admin      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              ADMIN ORDER SERVICE (NEW!)                             │
│         /backend/src/services/adminOrderService.ts                  │
│                                                                     │
│  Main Functions:                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ getAllOrdersForAdmin(filters)                              │   │
│  │  ├─ Query orders with customer join                        │   │
│  │  ├─ For each order:                                        │   │
│  │  │   └─ getOrderItemsWithDetails()                         │   │
│  │  │       ├─ Join order_items → variants → products         │   │
│  │  │       └─ getDesignImagesForOrderItem()                  │   │
│  │  │           ├─ Extract asset IDs from custom_spec         │   │
│  │  │           └─ Query assets table                         │   │
│  │  └─ Return complete order objects                          │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ getOrderByIdForAdmin(orderId)                              │   │
│  │  ├─ Query single order with customer join                  │   │
│  │  ├─ getOrderItemsWithDetails()                             │   │
│  │  └─ Return complete order object                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ updateOrderProductionStatusAdmin()                         │   │
│  │  ├─ Update order status, tracking, carrier                 │   │
│  │  ├─ Insert into order_status_history                       │   │
│  │  └─ Return updated complete order                          │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SQL Queries
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRESQL DATABASE                      │
│                                                                     │
│  ┌──────────────────────┐                                          │
│  │      orders          │                                          │
│  ├──────────────────────┤                                          │
│  │ id (UUID)            │                                          │
│  │ order_number         │                                          │
│  │ customer_id ─────────┼──┐                                       │
│  │ subtotal, tax, etc   │  │                                       │
│  │ payment_status       │  │                                       │
│  │ production_status    │  │   ┌──────────────────────┐           │
│  │ tracking_number      │  │   │    customers         │           │
│  │ carrier              │  │   ├──────────────────────┤           │
│  │ shipping_address     │  └──►│ id (UUID)            │           │
│  │ billing_address      │      │ name                 │           │
│  │ customer_notes       │      │ email                │           │
│  │ internal_notes       │      │ phone                │           │
│  │ created_at           │      │ addresses (JSONB)    │           │
│  └──────────────────────┘      └──────────────────────┘           │
│            │                                                        │
│            │                                                        │
│            ▼                                                        │
│  ┌──────────────────────┐                                          │
│  │    order_items       │                                          │
│  ├──────────────────────┤                                          │
│  │ id (UUID)            │                                          │
│  │ order_id ────────────┼──┐ (FK to orders)                        │
│  │ variant_id ──────────┼──┼──┐                                    │
│  │ quantity             │  │  │                                    │
│  │ unit_price           │  │  │                                    │
│  │ total_price          │  │  │                                    │
│  │ custom_spec (JSONB) ─┼──┼──┼──┐ Contains:                      │
│  │  ├─ method           │  │  │  │ - artwork_assets[]             │
│  │  ├─ artwork_assets[] │  │  │  │ - placements[]                 │
│  │  ├─ placements[]     │  │  │  │ - design_data                  │
│  │  └─ design_data      │  │  │  │                                │
│  │ production_status    │  │  │  │                                │
│  │ mockup_url           │  │  │  │                                │
│  └──────────────────────┘  │  │  │                                │
│                             │  │  │                                │
│                             │  ▼  │                                │
│                             │ ┌──────────────────────┐            │
│                             │ │     variants         │            │
│                             │ ├──────────────────────┤            │
│                             │ │ id (UUID)            │            │
│                             │ │ product_id ──────────┼──┐         │
│                             │ │ color                │  │         │
│                             │ │ size                 │  │         │
│                             │ │ sku                  │  │         │
│                             │ │ base_price           │  │         │
│                             │ └──────────────────────┘  │         │
│                             │                           │         │
│                             │                           ▼         │
│                             │                  ┌──────────────────────┐
│                             │                  │    products          │
│                             │                  ├──────────────────────┤
│                             │                  │ id (UUID)            │
│                             │                  │ title                │
│                             │                  │ slug                 │
│                             │                  │ description          │
│                             │                  └──────────────────────┘
│                             │
│                             │
│                             ▼
│  ┌──────────────────────────────────────────────────────────┐
│  │                      assets                              │
│  ├──────────────────────────────────────────────────────────┤
│  │ id (UUID) ◄────────────────────────┐                     │
│  │ owner_type ('order', 'job', etc)   │                     │
│  │ owner_id                            │                     │
│  │ file_url (Supabase Storage URL)     │                     │
│  │ kind ('upload', 'white_bg',         │                     │
│  │       'transparent')                │                     │
│  │ width, height, dpi                  │                     │
│  │ job_id ──────────┐                  │                     │
│  │ created_at       │                  │                     │
│  └──────────────────┼──────────────────┘                     │
│                     │                  │                     │
│                     │  Referenced by:  │                     │
│                     │  - custom_spec.artwork_assets[]        │
│                     │  - custom_spec.placements[].artwork_id │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────┐                                   │
│  │       jobs           │                                   │
│  ├──────────────────────┤                                   │
│  │ id (UUID)            │                                   │
│  │ user_id              │                                   │
│  │ upload_asset_id      │                                   │
│  │ status               │                                   │
│  │ result_data (JSONB)  │ Contains:                         │
│  │  ├─ originalAssetId  │ - originalAssetId                │
│  │  ├─ whiteBgAssetId   │ - whiteBgAssetId                 │
│  │  └─ transparentAssetId - transparentAssetId            │
│  │ created_at           │                                   │
│  └──────────────────────┘                                   │
│                                                             │
│  AI Extraction Flow:                                        │
│  1. Upload photo → asset (kind='upload')                   │
│  2. Create job → jobs table                                │
│  3. Gemini extracts → asset (kind='white_bg')              │
│  4. Remove.bg processes → asset (kind='transparent')       │
│  5. Job completes → result_data updated                    │
│  6. Asset IDs saved to order_items.custom_spec             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
                         SQL JOIN STRATEGY
═══════════════════════════════════════════════════════════════════════

1. Base Query: orders → customers
   ┌────────────────────────────────────────────────┐
   │ SELECT o.*, c.name, c.email, c.phone           │
   │ FROM orders o                                  │
   │ INNER JOIN customers c ON o.customer_id = c.id │
   │ WHERE [filters]                                │
   │ ORDER BY o.created_at DESC                     │
   └────────────────────────────────────────────────┘

2. For Each Order: order_items → variants → products
   ┌────────────────────────────────────────────────┐
   │ SELECT oi.*, v.color, v.size, v.sku,           │
   │        p.title, p.slug                         │
   │ FROM order_items oi                            │
   │ INNER JOIN variants v ON oi.variant_id = v.id  │
   │ INNER JOIN products p ON v.product_id = p.id   │
   │ WHERE oi.order_id = $1                         │
   └────────────────────────────────────────────────┘

3. For Each Item: Extract Asset IDs from custom_spec
   ┌────────────────────────────────────────────────┐
   │ asset_ids = [                                  │
   │   ...custom_spec.artwork_assets,               │
   │   ...custom_spec.placements.map(p=>p.artwork_id)│
   │ ]                                              │
   └────────────────────────────────────────────────┘

4. Fetch Assets: assets by ID
   ┌────────────────────────────────────────────────┐
   │ SELECT id, file_url, kind, width, height, dpi  │
   │ FROM assets                                    │
   │ WHERE id = ANY($1::uuid[])                     │
   └────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
                      AUTHENTICATION FLOW
═══════════════════════════════════════════════════════════════════════

1. Admin Login
   User → POST /api/auth/login
        { email, password }
        ↓
   Backend validates credentials
        ↓
   Generate JWT token
        ↓
   Return { token, user }
        ↓
   Frontend stores in localStorage['auth_token']

2. Admin API Request
   Frontend → GET /api/admin/orders
   Headers: { Authorization: 'Bearer {token}' }
        ↓
   authenticate() middleware
     - Verify JWT signature
     - Extract user from token
     - Attach to req.user
        ↓
   authorize('admin') middleware
     - Check req.user.role === 'admin'
     - Reject if not admin
        ↓
   Controller processes request
        ↓
   Return data

═══════════════════════════════════════════════════════════════════════
                      COMPLETE RESPONSE EXAMPLE
═══════════════════════════════════════════════════════════════════════

{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "order_number": "RB-1733587200000-XYZ45",
        "customer": {
          "id": "customer-uuid",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "phone": "+1-555-0123"
        },
        "shipping_address": {
          "line1": "456 Oak Avenue",
          "line2": "Suite 300",
          "city": "Los Angeles",
          "state": "CA",
          "postal_code": "90001",
          "country": "US"
        },
        "items": [
          {
            "id": "item-uuid",
            "product_name": "Premium T-Shirt",
            "product_slug": "premium-tshirt",
            "variant_details": {
              "color": "Black",
              "size": "XL",
              "sku": "PREMIUM-BLK-XL"
            },
            "quantity": 3,
            "unit_price": 34.99,
            "total_price": 104.97,
            "custom_design": {
              "design_data": {
                "front": [...],
                "back": [...]
              },
              "design_images": [
                {
                  "asset_id": "asset-uuid",
                  "file_url": "https://supabase.co/storage/v1/object/public/designs/abc123.png",
                  "kind": "transparent",
                  "width": 4000,
                  "height": 4000,
                  "dpi": 300
                }
              ],
              "custom_spec": {
                "method": "screen_print",
                "artwork_assets": ["asset-uuid"],
                "placements": [...]
              }
            },
            "production_status": "pending"
          }
        ],
        "totals": {
          "subtotal": 104.97,
          "tax": 9.45,
          "shipping": 12.00,
          "discount": 0,
          "total": 126.42
        },
        "payment_status": "paid",
        "payment_intent_id": "pi_3QRabcXYZ",
        "production_status": "pending",
        "tracking_number": null,
        "carrier": null,
        "shipped_at": null,
        "customer_notes": "Please gift wrap",
        "internal_notes": null,
        "created_at": "2025-12-07T15:30:00Z",
        "updated_at": "2025-12-07T15:30:00Z"
      }
    ]
  }
}

═══════════════════════════════════════════════════════════════════════
                          KEY FEATURES
═══════════════════════════════════════════════════════════════════════

✓ Complete order data in single API call
✓ Customer information included
✓ Product and variant details
✓ Gemini-generated design images (transparent PNGs for production)
✓ All pricing and totals
✓ Payment and production status
✓ Tracking number support
✓ Internal admin notes
✓ Filtering by status
✓ Single order detail view
✓ Status update with tracking
✓ Audit trail (order_status_history)
✓ Authentication & authorization
✓ Type-safe with TypeScript
✓ Error handling built-in
✓ Production-ready
