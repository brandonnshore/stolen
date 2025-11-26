# API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:3001` (Development) | `https://your-api.com` (Production)
**Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Products](#products)
3. [Orders](#orders)
4. [Uploads](#uploads)
5. [Pricing](#pricing)
6. [Designs](#designs)
7. [Jobs](#jobs)
8. [Admin](#admin)
9. [Webhooks](#webhooks)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)

---

## Authentication

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2025-11-26T12:00:00Z"
    }
  }
}
```

**Errors:**
- `400` - Missing required fields
- `409` - Email already exists

**Example (cURL):**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePassword123!","name":"John Doe"}'
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    name: 'John Doe'
  })
});
const data = await response.json();
```

---

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

**Errors:**
- `400` - Missing email or password
- `401` - Invalid credentials

**Example (cURL):**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePassword123!"}'
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});
const { data } = await response.json();
const token = data.token; // Store this for authenticated requests
```

---

### POST /api/auth/oauth/sync

Sync OAuth user with backend database (for Google OAuth integration).

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "supabaseId": "supabase-user-id"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "supabase_id": "supabase-user-id"
    }
  }
}
```

**Errors:**
- `400` - Missing required fields

---

### GET /api/auth/me

Get current authenticated user details.

**Authentication:** Required (JWT Bearer Token)

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "created_at": "2025-11-26T12:00:00Z"
    }
  }
}
```

**Errors:**
- `401` - Not authenticated
- `404` - User not found

**Example (cURL):**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:3001/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
```

---

## Products

### GET /api/products

Get all active products with variants.

**Query Parameters:** None

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Classic T-Shirt",
        "slug": "classic-tshirt",
        "description": "100% cotton classic fit t-shirt",
        "base_price": 15.00,
        "status": "active",
        "images": {
          "white": "https://...",
          "black": "https://..."
        },
        "variants": [
          {
            "id": 1,
            "product_id": 1,
            "color": "white",
            "size": "M",
            "sku": "TSHIRT-WHITE-M",
            "price": 15.00,
            "stock": 100
          }
        ]
      }
    ]
  }
}
```

**Example (cURL):**
```bash
curl http://localhost:3001/api/products
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:3001/api/products');
const { data } = await response.json();
const products = data.products;
```

---

### GET /api/products/:slug

Get specific product details by slug.

**Path Parameters:**
- `slug` (string) - Product slug (e.g., "classic-tshirt")

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "Classic T-Shirt",
      "slug": "classic-tshirt",
      "description": "100% cotton classic fit t-shirt",
      "base_price": 15.00,
      "status": "active",
      "images": {
        "white": "https://...",
        "black": "https://..."
      },
      "variants": [...]
    },
    "decorationMethods": [
      {
        "id": 1,
        "name": "Screen Print",
        "slug": "screen-print",
        "base_price": 5.00,
        "price_per_color": 2.00,
        "setup_fee": 25.00
      }
    ]
  }
}
```

**Errors:**
- `404` - Product not found

**Example (cURL):**
```bash
curl http://localhost:3001/api/products/classic-tshirt
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:3001/api/products/classic-tshirt');
const { data } = await response.json();
const product = data.product;
const decorationMethods = data.decorationMethods;
```

---

## Orders

### POST /api/orders/create

Create a new order.

**Request Body:**
```json
{
  "items": [
    {
      "product_id": 1,
      "variant_id": 1,
      "quantity": 10,
      "decoration_method_id": 1,
      "decoration_placement": "front-chest",
      "design_data": {
        "artwork_url": "https://...",
        "text": "Custom Text",
        "colors": ["#000000"]
      }
    }
  ],
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "shipping_address": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "US"
    }
  },
  "payment_intent_id": "pi_stripe_payment_intent_id"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "order_number": "ORD-20251126-001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "total_amount": 150.00,
      "status": "pending",
      "items": [...],
      "created_at": "2025-11-26T12:00:00Z"
    }
  }
}
```

**Errors:**
- `400` - Invalid order data
- `422` - Payment validation failed

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:3001/api/orders/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [...],
    customer: {...},
    payment_intent_id: 'pi_...'
  })
});
const { data } = await response.json();
```

---

### GET /api/orders/:id

Get order details by ID.

**Path Parameters:**
- `id` (string) - Order UUID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "order_number": "ORD-20251126-001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "total_amount": 150.00,
      "status": "processing",
      "items": [...],
      "created_at": "2025-11-26T12:00:00Z",
      "status_history": [
        {
          "status": "pending",
          "timestamp": "2025-11-26T12:00:00Z"
        },
        {
          "status": "processing",
          "timestamp": "2025-11-26T12:30:00Z"
        }
      ]
    }
  }
}
```

**Errors:**
- `404` - Order not found

**Example (JavaScript):**
```javascript
const orderId = 'order-uuid';
const response = await fetch(`http://localhost:3001/api/orders/${orderId}`);
const { data } = await response.json();
```

---

### POST /api/orders/:id/capture-payment

Capture payment for an order (Stripe integration).

**Path Parameters:**
- `id` (string) - Order UUID

**Request Body:**
```json
{
  "payment_intent_id": "pi_stripe_payment_intent_id"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "payment_captured": true,
    "order": {...}
  }
}
```

**Errors:**
- `400` - Payment capture failed
- `404` - Order not found

---

## Uploads

### POST /api/uploads/signed-url

Get a signed URL for uploading files to cloud storage.

**Request Body:**
```json
{
  "fileName": "logo.png",
  "fileType": "image/png"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "signedUrl": "https://storage.supabase.co/...",
    "fileUrl": "https://storage.supabase.co/public/...",
    "fileName": "logo-uuid.png"
  }
}
```

**Example (JavaScript):**
```javascript
// Step 1: Get signed URL
const { data } = await fetch('http://localhost:3001/api/uploads/signed-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'logo.png',
    fileType: 'image/png'
  })
}).then(r => r.json());

// Step 2: Upload file to signed URL
await fetch(data.signedUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/png' },
  body: file
});

// Step 3: Use fileUrl in your application
const logoUrl = data.fileUrl;
```

---

### POST /api/uploads/file

Upload a file directly to the server (multipart/form-data).

**Request:** `multipart/form-data`
- `file` (File) - The file to upload

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://your-api.com/uploads/file-uuid.png",
    "fileName": "file-uuid.png"
  }
}
```

**Rate Limit:** 100 requests per 15 minutes

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3001/api/uploads/file', {
  method: 'POST',
  body: formData
});
const { data } = await response.json();
```

---

### POST /api/uploads/shirt-photo

Upload shirt photo for AI logo extraction.

**Request:** `multipart/form-data`
- `photo` (File) - Shirt photo to extract logo from

**Authentication:** Required (JWT Bearer Token)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "message": "Logo extraction job started",
    "status": "processing"
  }
}
```

**Rate Limit:** 10 requests per hour (strict limit due to AI processing cost)

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('photo', photoInput.files[0]);

const response = await fetch('http://localhost:3001/api/uploads/shirt-photo', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
const { data } = await response.json();
// Poll /api/jobs/:id to check status
```

---

## Pricing

### POST /api/price/quote

Calculate price quote for custom order.

**Request Body:**
```json
{
  "product_id": 1,
  "variant_id": 1,
  "quantity": 10,
  "decoration_method_id": 1,
  "decoration_options": {
    "color_count": 2,
    "placement_count": 1
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "quote": {
      "subtotal": 150.00,
      "setup_fee": 25.00,
      "decoration_cost": 40.00,
      "total": 215.00,
      "price_per_unit": 21.50,
      "breakdown": {
        "base_price": 15.00,
        "decoration_per_unit": 4.00,
        "quantity_discount": -0.50
      }
    }
  }
}
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:3001/api/price/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 1,
    variant_id: 1,
    quantity: 10,
    decoration_method_id: 1,
    decoration_options: {
      color_count: 2,
      placement_count: 1
    }
  })
});
const { data } = await response.json();
const total = data.quote.total;
```

---

## Designs

**Authentication Required:** All design endpoints require JWT Bearer Token.

### POST /api/designs

Save a new design.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "name": "My Logo Design",
  "product_slug": "classic-tshirt",
  "design_data": {
    "objects": [...],
    "background": "#ffffff"
  },
  "thumbnail_url": "https://..."
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "design": {
      "id": "uuid",
      "user_id": "user-uuid",
      "name": "My Logo Design",
      "product_slug": "classic-tshirt",
      "design_data": {...},
      "thumbnail_url": "https://...",
      "created_at": "2025-11-26T12:00:00Z"
    }
  }
}
```

---

### GET /api/designs

Get all designs for authenticated user.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "designs": [
      {
        "id": "uuid",
        "name": "My Logo Design",
        "product_slug": "classic-tshirt",
        "thumbnail_url": "https://...",
        "created_at": "2025-11-26T12:00:00Z"
      }
    ]
  }
}
```

---

### GET /api/designs/:id

Get specific design by ID.

**Path Parameters:**
- `id` (string) - Design UUID

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "design": {
      "id": "uuid",
      "user_id": "user-uuid",
      "name": "My Logo Design",
      "product_slug": "classic-tshirt",
      "design_data": {...},
      "thumbnail_url": "https://...",
      "created_at": "2025-11-26T12:00:00Z"
    }
  }
}
```

**Errors:**
- `404` - Design not found
- `403` - Not authorized to view this design

---

### PUT /api/designs/:id

Update existing design.

**Path Parameters:**
- `id` (string) - Design UUID

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "name": "Updated Design Name",
  "design_data": {...},
  "thumbnail_url": "https://..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "design": {...}
  }
}
```

---

### DELETE /api/designs/:id

Delete a design.

**Path Parameters:**
- `id` (string) - Design UUID

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Design deleted successfully"
}
```

---

## Jobs

**Authentication Required:** All job endpoints require JWT Bearer Token.

### POST /api/jobs/start

Start a new background job (e.g., logo extraction).

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "type": "logo_extraction",
  "input": {
    "image_url": "https://..."
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "job-uuid",
      "type": "logo_extraction",
      "status": "pending",
      "created_at": "2025-11-26T12:00:00Z"
    }
  }
}
```

---

### GET /api/jobs/:id

Get job status and results.

**Path Parameters:**
- `id` (string) - Job UUID

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "job-uuid",
      "type": "logo_extraction",
      "status": "completed",
      "progress": 100,
      "result": {
        "extracted_logo_url": "https://...",
        "confidence": 0.95
      },
      "created_at": "2025-11-26T12:00:00Z",
      "completed_at": "2025-11-26T12:02:00Z"
    }
  }
}
```

**Status Values:**
- `pending` - Job queued
- `processing` - Job in progress
- `completed` - Job finished successfully
- `failed` - Job failed

---

### GET /api/jobs

Get all jobs for authenticated user.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `status` (optional) - Filter by status
- `limit` (optional) - Number of results (default: 20)
- `offset` (optional) - Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "jobs": [...],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Admin

**Authentication Required:** All admin endpoints require JWT Bearer Token with `admin` role.

### POST /api/admin/products

Create a new product.

**Request Headers:**
```
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Request Body:**
```json
{
  "name": "Premium Hoodie",
  "slug": "premium-hoodie",
  "description": "High quality fleece hoodie",
  "base_price": 35.00,
  "status": "active",
  "images": {
    "black": "https://...",
    "gray": "https://..."
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 2,
      "name": "Premium Hoodie",
      "slug": "premium-hoodie",
      "created_at": "2025-11-26T12:00:00Z"
    }
  }
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not authorized (admin role required)
- `409` - Product slug already exists

---

### PUT /api/admin/products/:id

Update existing product.

**Path Parameters:**
- `id` (number) - Product ID

**Request Headers:**
```
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Request Body:**
```json
{
  "name": "Premium Hoodie Updated",
  "base_price": 38.00,
  "status": "active"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "product": {...}
  }
}
```

---

### DELETE /api/admin/products/:id

Delete a product.

**Path Parameters:**
- `id` (number) - Product ID

**Request Headers:**
```
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

### GET /api/admin/orders

Get all orders (admin view).

**Request Headers:**
```
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Query Parameters:**
- `status` (optional) - Filter by status
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

### PATCH /api/admin/orders/:id/status

Update order status.

**Path Parameters:**
- `id` (string) - Order UUID

**Request Headers:**
```
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Request Body:**
```json
{
  "status": "processing",
  "notes": "Started production"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "order": {...}
  }
}
```

**Valid Status Values:**
- `pending`
- `processing`
- `in_production`
- `shipped`
- `delivered`
- `cancelled`

---

## Webhooks

### POST /api/webhooks/stripe

Stripe webhook endpoint for payment events.

**Request Headers:**
```
stripe-signature: t=1234567890,v1=signature...
```

**Request Body:** Raw Stripe webhook payload (raw body required for signature verification)

**Response:** `200 OK`
```json
{
  "received": true
}
```

**Events Handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

**Note:** This endpoint requires raw body for Stripe signature verification. Ensure your server doesn't parse the body before this endpoint.

---

### POST /api/webhooks/production-update

Webhook for production partner status updates.

**Request Body:**
```json
{
  "order_number": "ORD-20251126-001",
  "status": "in_production",
  "tracking_number": "1Z999AA10123456784",
  "estimated_delivery": "2025-12-01"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Order status updated"
}
```

---

## Error Handling

All API errors follow a consistent format:

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

**Common HTTP Status Codes:**
- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Example Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid email or password",
    "code": "INVALID_CREDENTIALS",
    "details": {}
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

### Default Rate Limits

- **General API:** 100 requests per 15 minutes per IP
- **Upload Endpoints:** 100 requests per 15 minutes per IP
- **Shirt Photo Upload:** 10 requests per hour per IP (strict due to AI processing cost)

### Rate Limit Headers

Responses include rate limit information:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1700000000
```

### Rate Limit Exceeded Response

**Status:** `429 Too Many Requests`
```json
{
  "success": false,
  "error": {
    "message": "Too many requests from this IP, please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "retry_after": 900
  }
}
```

---

## Best Practices

### 1. Authentication

Always include the JWT token in the Authorization header for protected endpoints:

```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### 2. Error Handling

Always check the `success` field in responses:

```javascript
const response = await fetch('/api/products');
const json = await response.json();

if (!json.success) {
  console.error('API Error:', json.error.message);
  // Handle error
  return;
}

const products = json.data.products;
```

### 3. File Uploads

For large files, use the signed URL approach:

```javascript
// Step 1: Get signed URL
const { data } = await fetch('/api/uploads/signed-url', {
  method: 'POST',
  body: JSON.stringify({ fileName: 'logo.png', fileType: 'image/png' })
}).then(r => r.json());

// Step 2: Upload directly to cloud storage
await fetch(data.signedUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/png' },
  body: file
});

// Step 3: Use the fileUrl
const logoUrl = data.fileUrl;
```

### 4. Polling for Job Status

When starting background jobs, poll the status endpoint:

```javascript
async function pollJobStatus(jobId) {
  const maxAttempts = 60; // 5 minutes (5 second intervals)

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { data } = await response.json();

    if (data.job.status === 'completed') {
      return data.job.result;
    }

    if (data.job.status === 'failed') {
      throw new Error('Job failed');
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
  }

  throw new Error('Job timed out');
}
```

### 5. Pagination

For endpoints that support pagination:

```javascript
async function getAllOrders() {
  const allOrders = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await fetch(
      `/api/admin/orders?limit=${limit}&offset=${offset}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const { data } = await response.json();

    allOrders.push(...data.orders);

    if (data.orders.length < limit) break;
    offset += limit;
  }

  return allOrders;
}
```

---

## API Versioning

Current API version: **v1.0.0**

The API is currently unversioned. Future versions will use URL-based versioning:
- Current: `/api/products`
- Future: `/api/v2/products`

---

## Support

For API support, please:
1. Check this documentation
2. Review [Troubleshooting Guide](./TROUBLESHOOTING.md)
3. Open an issue on GitHub

---

**Last Updated:** 2025-11-26
**Maintainer:** StolenTee Development Team
