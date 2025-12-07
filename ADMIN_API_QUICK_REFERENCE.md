# Admin Dashboard API - Quick Reference

## Import the API

```typescript
import { adminAPI } from '@/services/api';
```

---

## 1. Get All Orders

```typescript
// Get all orders (no filter)
const orders = await adminAPI.getAllOrders();

// Filter by production status
const pendingOrders = await adminAPI.getAllOrders({
  production_status: 'pending'
});

// Filter by payment status
const paidOrders = await adminAPI.getAllOrders({
  payment_status: 'paid'
});

// Multiple filters
const unpaidPending = await adminAPI.getAllOrders({
  payment_status: 'pending',
  production_status: 'pending'
});
```

**Returns**: Array of orders with complete data

---

## 2. Get Single Order Details

```typescript
const order = await adminAPI.getOrderById('order-uuid-here');
```

**Returns**: Single order object with all details, or null if not found

---

## 3. Update Order Status

```typescript
// Update to in_production
await adminAPI.updateOrderStatus(orderId, 'in_production', {
  internal_notes: 'Started production on 2025-12-07'
});

// Update to shipped with tracking
await adminAPI.updateOrderStatus(orderId, 'shipped', {
  tracking_number: '1Z999AA10123456784',
  carrier: 'UPS',
  internal_notes: 'Shipped via UPS Ground'
});

// Update with just notes
await adminAPI.updateOrderStatus(orderId, 'in_production', {
  internal_notes: 'Waiting for custom artwork approval'
});
```

**Returns**: Updated order object

---

## 4. Add Tracking Number (Convenience Method)

```typescript
// Automatically sets status to 'shipped'
const shippedOrder = await adminAPI.addTrackingNumber(
  orderId,
  '1Z999AA10123456784',
  'UPS' // optional, defaults to 'USPS'
);
```

**Returns**: Updated order object

---

## Order Data Structure

```typescript
{
  id: "uuid",
  order_number: "RB-1234567890-ABC12",
  customer: {
    id: "uuid",
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890"
  },
  shipping_address: {
    line1: "123 Main St",
    line2: "Apt 4B",
    city: "New York",
    state: "NY",
    postal_code: "10001",
    country: "US"
  },
  items: [
    {
      id: "uuid",
      product_name: "Classic T-Shirt",
      product_slug: "classic-tshirt",
      variant_details: {
        color: "Black",
        size: "L",
        sku: "TSHIRT-BLK-L"
      },
      quantity: 2,
      unit_price: 29.99,
      total_price: 59.98,
      custom_design: {
        design_data: { /* Canvas positions, rotations */ },
        design_images: [
          {
            asset_id: "uuid",
            file_url: "https://supabase.../design.png",
            kind: "transparent", // or 'white_bg', 'upload'
            width: 4000,
            height: 4000,
            dpi: 300
          }
        ],
        custom_spec: { /* Full customization spec */ }
      },
      production_status: "pending",
      mockup_url: "https://...",
      production_pack_url: "https://..."
    }
  ],
  totals: {
    subtotal: 59.98,
    tax: 5.40,
    shipping: 8.00,
    discount: 0,
    total: 73.38
  },
  payment_status: "paid",
  payment_method: "card",
  payment_intent_id: "pi_...",
  production_status: "pending",
  tracking_number: null,
  carrier: null,
  shipped_at: null,
  customer_notes: "Please use eco-friendly packaging",
  internal_notes: "VIP customer",
  created_at: "2025-12-07T10:00:00Z",
  updated_at: "2025-12-07T10:00:00Z"
}
```

---

## Status Values

### Production Status
- `pending` - Order received, not started
- `in_production` - Currently being produced
- `shipped` - Shipped to customer
- `cancelled` - Order cancelled

### Payment Status
- `pending` - Payment not completed
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

---

## Design Images

Each order item contains `custom_design.design_images` array:

```typescript
order.items[0].custom_design.design_images.forEach(image => {
  console.log('Asset ID:', image.asset_id);
  console.log('URL:', image.file_url); // Direct Supabase URL
  console.log('Type:', image.kind); // 'transparent', 'white_bg', 'upload'
  console.log('Size:', image.width, 'x', image.height);
  console.log('DPI:', image.dpi); // Should be 300 for print quality
});
```

**Image Kinds**:
- `upload` - Original photo uploaded by user
- `white_bg` - Gemini-extracted design on white background
- `transparent` - Final transparent PNG (use this for production)

---

## Error Handling

```typescript
try {
  const orders = await adminAPI.getAllOrders();
} catch (error) {
  if (error.response?.status === 401) {
    // Not authenticated or not admin
    console.error('Authentication required');
  } else if (error.response?.status === 404) {
    // Order not found
    console.error('Order not found');
  } else {
    // Other error
    console.error('API error:', error.message);
  }
}
```

---

## Authentication

All admin API methods require:
1. Valid JWT token (automatically added by axios interceptor)
2. User must have `role = 'admin'` in database

Token is stored in localStorage as 'auth_token' after login.

---

## Example: Display Order List

```typescript
import { useState, useEffect } from 'react';
import { adminAPI } from '@/services/api';

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await adminAPI.getAllOrders({
        production_status: 'pending'
      });
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <h3>{order.order_number}</h3>
          <p>Customer: {order.customer.name}</p>
          <p>Total: ${order.totals.total}</p>
          <p>Status: {order.production_status}</p>
          <p>Items: {order.items.length}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Example: Update Order Status

```typescript
const handleShipOrder = async (orderId) => {
  try {
    const trackingNumber = prompt('Enter tracking number:');
    const carrier = 'UPS';

    await adminAPI.addTrackingNumber(orderId, trackingNumber, carrier);

    toast.success('Order marked as shipped!');
    loadOrders(); // Refresh list
  } catch (error) {
    toast.error('Failed to ship order');
    console.error(error);
  }
};
```

---

## Example: Display Design Images

```typescript
function OrderItemDesign({ item }) {
  const transparentImage = item.custom_design.design_images.find(
    img => img.kind === 'transparent'
  );

  if (!transparentImage) {
    return <div>No design image available</div>;
  }

  return (
    <div>
      <img
        src={transparentImage.file_url}
        alt="Design"
        style={{ maxWidth: '300px' }}
      />
      <p>Resolution: {transparentImage.width}x{transparentImage.height}</p>
      <p>DPI: {transparentImage.dpi}</p>
      <a href={transparentImage.file_url} download>
        Download for Production
      </a>
    </div>
  );
}
```

---

## Production Ready Checklist

- [ ] Import adminAPI from '@/services/api'
- [ ] Handle loading states
- [ ] Handle errors (401, 404, etc.)
- [ ] Display customer information
- [ ] Display shipping address
- [ ] Show all order items with product details
- [ ] Display design images (use 'transparent' kind for production)
- [ ] Allow status updates
- [ ] Allow adding tracking numbers
- [ ] Show totals (subtotal, tax, shipping, total)
- [ ] Display payment status
- [ ] Filter orders by status

---

## Need Help?

- Full documentation: `/ADMIN_BACKEND_INTEGRATION_REPORT.md`
- SQL verification: `/backend/ADMIN_DATA_VERIFICATION.sql`
- Backend service: `/backend/src/services/adminOrderService.ts`
- Frontend API: `/frontend/src/services/api.ts`
