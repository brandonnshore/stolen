# System Architecture

**Project:** StolenTee - Custom Clothing E-commerce Platform
**Version:** 1.0.0
**Last Updated:** 2025-11-26

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack](#technology-stack)
3. [System Components](#system-components)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [Service Integrations](#service-integrations)
7. [Queue Architecture](#queue-architecture)
8. [Authentication Flow](#authentication-flow)
9. [File Storage](#file-storage)
10. [Deployment Architecture](#deployment-architecture)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  Web Browser │    │ Mobile Web   │    │ Admin Panel  │     │
│  │   (React)    │    │   (React)    │    │   (React)    │     │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│         │                   │                   │              │
│         └───────────────────┴───────────────────┘              │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    HTTPS (REST API)
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                     APPLICATION TIER                             │
├────────────────────────────┼────────────────────────────────────┤
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Express.js API Server (Node.js)               │   │
│  │                                                           │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────┐  │   │
│  │  │  Routes   │  │Middleware │  │    Controllers    │  │   │
│  │  │ /api/*    │  │Auth, CORS │  │  Business Logic   │  │   │
│  │  └─────┬─────┘  └─────┬─────┘  └────────┬──────────┘  │   │
│  │        │              │                  │              │   │
│  │        └──────────────┴──────────────────┘              │   │
│  │                       │                                  │   │
│  │        ┌──────────────┴──────────────┐                  │   │
│  │        ▼                             ▼                  │   │
│  │  ┌──────────┐                  ┌──────────┐            │   │
│  │  │ Services │                  │ Workers  │            │   │
│  │  │ Layer    │◄─────Queue───────│ (Bull)   │            │   │
│  │  └────┬─────┘                  └──────────┘            │   │
│  │       │                                                 │   │
│  └───────┼─────────────────────────────────────────────────┘   │
│          │                                                      │
└──────────┼──────────────────────────────────────────────────────┘
           │
           ├──────────────────┬──────────────────┬────────────────┐
           │                  │                  │                │
           ▼                  ▼                  ▼                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DATA TIER                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  PostgreSQL  │  │    Redis     │  │  Supabase Storage  │    │
│  │   Database   │  │  (Bull Queue)│  │   (File Storage)   │    │
│  │              │  │              │  │                    │    │
│  │  • Users     │  │  • Jobs      │  │  • Images          │    │
│  │  • Products  │  │  • Sessions  │  │  • Logos           │    │
│  │  • Orders    │  │              │  │  • Designs         │    │
│  │  • Designs   │  │              │  │                    │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
           │                  │                  │
           │                  │                  │
           ▼                  ▼                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES TIER                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │    Stripe    │  │ Google       │  │  Remove.bg / Gemini  │   │
│  │   Payments   │  │ OAuth        │  │   AI Services        │   │
│  │              │  │              │  │                      │   │
│  │ • Checkout   │  │ • Login      │  │ • Background Removal │   │
│  │ • Webhooks   │  │ • User Sync  │  │ • Logo Extraction   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
```
┌─────────────────────────────────────────────┐
│  React 18.3.1         - UI Framework        │
│  TypeScript 5.6.3     - Type Safety         │
│  Vite 6.0.0           - Build Tool          │
│  React Router 7.0.1   - Client Routing      │
│  Zustand 5.0.2        - State Management    │
│  TailwindCSS 3.4.15   - Styling             │
│  Fabric.js 6.5.1      - Canvas Customizer   │
│  Stripe.js            - Payment UI          │
└─────────────────────────────────────────────┘
```

### Backend
```
┌─────────────────────────────────────────────┐
│  Node.js 20+          - Runtime             │
│  Express 4.21.1       - Web Framework       │
│  TypeScript 5.6.3     - Type Safety         │
│  PostgreSQL 14+       - Primary Database    │
│  Redis 7+             - Queue & Cache       │
│  Bull 4.16.3          - Job Queue           │
│  Stripe SDK           - Payment Processing  │
│  @supabase/supabase-js - Storage & Auth    │
└─────────────────────────────────────────────┘
```

### DevOps & Infrastructure
```
┌─────────────────────────────────────────────┐
│  Railway              - Backend Hosting     │
│  Vercel               - Frontend Hosting    │
│  Supabase             - Database & Storage  │
│  Upstash              - Redis Hosting       │
│  GitHub Actions       - CI/CD               │
└─────────────────────────────────────────────┘
```

---

## System Components

### 1. Frontend (React SPA)

**Location:** `/frontend/src/`

```
frontend/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # App layout wrapper
│   ├── Customizer.tsx  # Canvas-based design tool
│   ├── TShirtCanvas.tsx # T-shirt rendering
│   ├── HoodieCanvas.tsx # Hoodie rendering
│   └── Toast.tsx       # Notifications
│
├── pages/              # Route pages
│   ├── Login.tsx       # Authentication
│   ├── Register.tsx    # User registration
│   ├── Dashboard.tsx   # User designs
│   ├── Cart.tsx        # Shopping cart
│   ├── Checkout.tsx    # Payment flow
│   └── OrderTracking.tsx # Order status
│
├── stores/             # Zustand state management
│   └── cartStore.ts    # Shopping cart state
│
├── contexts/           # React contexts
│   ├── AuthContext.tsx # Authentication state
│   └── ThemeContext.tsx # Theme state
│
└── services/           # API client
    └── api.ts          # Axios instance & endpoints
```

**Key Features:**
- Server-side rendering ready (via Vite SSR)
- Responsive mobile-first design
- Real-time price calculation
- Canvas-based customizer with drag-and-drop
- Persistent shopping cart (localStorage)
- JWT-based authentication

---

### 2. Backend API (Express.js)

**Location:** `/backend/src/`

```
backend/
├── config/                 # Configuration
│   ├── env.ts             # Environment variables
│   └── database.ts        # PostgreSQL connection pool
│
├── routes/                 # API route definitions
│   ├── auth.ts            # /api/auth/*
│   ├── products.ts        # /api/products/*
│   ├── orders.ts          # /api/orders/*
│   ├── uploads.ts         # /api/uploads/*
│   ├── pricing.ts         # /api/price/*
│   ├── designs.ts         # /api/designs/*
│   ├── jobRoutes.ts       # /api/jobs/*
│   ├── admin.ts           # /api/admin/*
│   └── webhooks.ts        # /api/webhooks/*
│
├── controllers/            # Request handlers
│   ├── authController.ts
│   ├── productController.ts
│   ├── orderController.ts
│   └── ...
│
├── services/               # Business logic
│   ├── authService.ts     # User authentication
│   ├── productService.ts  # Product CRUD
│   ├── orderService.ts    # Order processing
│   ├── priceService.ts    # Price calculation
│   ├── uploadService.ts   # File uploads
│   ├── geminiService.ts   # AI logo extraction
│   ├── backgroundRemovalService.ts # Remove.bg integration
│   └── supabaseStorage.ts # Cloud storage
│
├── workers/                # Background jobs
│   ├── logoExtractionWorker.ts # AI processing
│   └── queueManager.ts    # Bull queue setup
│
├── middleware/             # Express middleware
│   ├── auth.ts            # JWT verification
│   ├── errorHandler.ts    # Error handling
│   └── notFound.ts        # 404 handler
│
└── index.ts                # Application entry point
```

**Key Features:**
- RESTful API design
- JWT authentication with role-based access control
- Rate limiting (100 req/15min general, 10 req/hour for AI)
- CORS with whitelist
- Helmet security headers
- Graceful shutdown handling
- Structured logging

---

### 3. Database (PostgreSQL)

**Core Tables:**

```sql
┌──────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  users                        designs                        │
│  ├── id (uuid, PK)           ├── id (uuid, PK)              │
│  ├── email (unique)          ├── user_id (FK → users)       │
│  ├── password_hash           ├── name                       │
│  ├── name                    ├── product_slug               │
│  ├── role (user/admin)       ├── design_data (jsonb)        │
│  └── created_at              ├── thumbnail_url              │
│                               └── created_at                 │
│  products                                                    │
│  ├── id (serial, PK)         orders                         │
│  ├── name                    ├── id (uuid, PK)              │
│  ├── slug (unique)           ├── order_number (unique)      │
│  ├── description             ├── customer_name              │
│  ├── base_price              ├── customer_email             │
│  ├── images (jsonb)          ├── total_amount               │
│  └── status                  ├── status                     │
│                               ├── payment_intent_id          │
│  variants                    ├── shipping_address (jsonb)   │
│  ├── id (serial, PK)         └── created_at                 │
│  ├── product_id (FK)                                        │
│  ├── color                   order_items                    │
│  ├── size                    ├── id (uuid, PK)              │
│  ├── sku (unique)            ├── order_id (FK → orders)     │
│  ├── price                   ├── product_id (FK)            │
│  └── stock                   ├── variant_id (FK)            │
│                               ├── quantity                   │
│  decoration_methods          ├── decoration_method_id (FK)  │
│  ├── id (serial, PK)         ├── decoration_placement       │
│  ├── name                    ├── design_data (jsonb)        │
│  ├── slug                    └── unit_price                 │
│  ├── base_price                                             │
│  ├── price_per_color         jobs                           │
│  └── setup_fee               ├── id (uuid, PK)              │
│                               ├── user_id (FK → users)       │
│  price_rules                 ├── type                       │
│  ├── id (serial, PK)         ├── status                     │
│  ├── min_quantity            ├── input (jsonb)              │
│  ├── max_quantity            ├── result (jsonb)             │
│  └── discount_percentage     └── created_at                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Indexes:**
- `users.email` (unique, btree)
- `products.slug` (unique, btree)
- `orders.order_number` (unique, btree)
- `orders.customer_email` (btree)
- `designs.user_id` (btree)
- `jobs.user_id, status` (btree)

---

## Data Flow

### 1. User Registration & Login Flow

```
┌─────────┐     POST /api/auth/register      ┌──────────┐
│ Browser │ ──────────────────────────────► │   API    │
│         │     { email, password, name }    │          │
└─────────┘                                  └────┬─────┘
                                                  │
                                                  ▼
                                         ┌────────────────┐
                                         │ authService    │
                                         │ • Hash password│
                                         │ • Create user  │
                                         └───────┬────────┘
                                                 │
                                                 ▼
                                         ┌────────────────┐
                                         │   PostgreSQL   │
                                         │   INSERT user  │
                                         └───────┬────────┘
                                                 │
                                                 ▼
┌─────────┐     { success: true, user }  ┌──────────┐
│ Browser │ ◄────────────────────────────│   API    │
│         │                               │          │
└─────────┘                               └──────────┘
```

### 2. Product Customization & Order Flow

```
┌─────────┐                                    ┌──────────┐
│ Browser │  1. GET /api/products/tshirt      │   API    │
│         │ ──────────────────────────────────►│          │
│         │ ◄──────────────────────────────────│          │
│         │    { product, variants, methods } │          │
│         │                                    │          │
│         │  2. User customizes design         │          │
│  Canvas │     (Fabric.js)                    │          │
│  Editor │     • Upload logo                  │          │
│         │     • Add text                     │          │
│         │     • Choose colors                │          │
│         │                                    │          │
│         │  3. POST /api/price/quote          │          │
│         │ ──────────────────────────────────►│          │
│         │    { product, quantity, method }   │          │
│         │ ◄──────────────────────────────────│          │
│         │    { total, breakdown }            │          │
│         │                                    │          │
│         │  4. Add to cart (localStorage)     │          │
│   Cart  │                                    │          │
│  Store  │                                    │          │
│         │                                    │          │
│         │  5. POST /api/orders/create        │          │
│         │ ──────────────────────────────────►│          │
│         │    { items, customer, payment }    │          │
│         │                                    └────┬─────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │ orderService │
│         │                                  │ • Validate   │
│         │                                  │ • Calculate  │
│         │                                  └──────┬───────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │  PostgreSQL  │
│         │                                  │ INSERT order │
│         │                                  └──────┬───────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │    Stripe    │
│         │                                  │ Create Intent│
│         │ ◄────────────────────────────────└──────────────┘
│         │    { orderId, clientSecret }
│         │
│         │  6. Stripe.js payment
│  Stripe │ ──────────────────────────────────► Stripe API
│   SDK   │ ◄──────────────────────────────────
│         │    Payment confirmed
│         │
│         │  7. POST /api/orders/:id/capture
│         │ ──────────────────────────────────►  API
└─────────┘ ◄──────────────────────────────────
               Order confirmed
```

### 3. AI Logo Extraction Flow

```
┌─────────┐                                    ┌──────────┐
│ Browser │  POST /api/uploads/shirt-photo    │   API    │
│         │  (multipart/form-data)            │          │
│         │ ──────────────────────────────────►│          │
│         │                                    └────┬─────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │uploadService │
│         │                                  │ • Validate   │
│         │                                  │ • Save file  │
│         │                                  └──────┬───────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │ Supabase     │
│         │                                  │ Storage      │
│         │                                  └──────┬───────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │ jobService   │
│         │                                  │ Create job   │
│         │                                  └──────┬───────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │  Bull Queue  │
│         │                                  │  Add job     │
│         │ ◄────────────────────────────────└──────────────┘
│         │    { jobId, status: "pending" }
│         │
│         │  Poll: GET /api/jobs/:id
│         │ ──────────────────────────────────► API
│         │ ◄──────────────────────────────────
│         │    { status: "processing" }
│         │
│         │                                  ┌──────────────┐
│ (Wait)  │                                  │   Worker     │
│         │                                  │ Process job  │
│         │                                  └──────┬───────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │ Gemini API   │
│         │                                  │ Extract logo │
│         │                                  └──────┬───────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │ Remove.bg    │
│         │                                  │ Remove bg    │
│         │                                  └──────┬───────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │ Update job   │
│         │                                  │ status       │
│         │                                  └──────────────┘
│         │
│         │  Poll: GET /api/jobs/:id
│         │ ──────────────────────────────────► API
│         │ ◄──────────────────────────────────
│         │    { status: "completed", result }
└─────────┘
```

---

## Service Integrations

### 1. Stripe Payment Processing

**Purpose:** Payment gateway for order checkout

**Integration Points:**
- `/api/orders/create` - Create payment intent
- `/api/webhooks/stripe` - Handle payment events

**Flow:**
```javascript
// 1. Create order with payment intent
const order = await createOrder({ items, customer });

// 2. Stripe creates PaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: order.total * 100,
  currency: 'usd',
  metadata: { orderId: order.id }
});

// 3. Frontend collects payment
const { error } = await stripe.confirmCardPayment(clientSecret);

// 4. Webhook confirms payment
stripe.webhooks.constructEvent(payload, signature);
```

**Webhooks Handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

### 2. Google OAuth (Supabase)

**Purpose:** Social login for users

**Integration Points:**
- `/api/auth/oauth/sync` - Sync OAuth user to backend

**Flow:**
```javascript
// 1. User clicks "Sign in with Google"
supabase.auth.signInWithOAuth({ provider: 'google' });

// 2. User redirected to Google
// 3. Google redirects back with token
// 4. Frontend syncs user to backend
await fetch('/api/auth/oauth/sync', {
  method: 'POST',
  body: JSON.stringify({
    email: user.email,
    name: user.name,
    supabaseId: user.id
  })
});
```

---

### 3. Gemini AI (Logo Extraction)

**Purpose:** Extract logos from shirt photos using AI

**Integration Points:**
- `geminiService.ts` - AI processing
- `logoExtractionWorker.ts` - Background job

**Flow:**
```javascript
// 1. User uploads shirt photo
// 2. Worker processes image
const result = await gemini.generateContent({
  contents: [{
    role: 'user',
    parts: [
      { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
      { text: 'Extract the logo from this shirt' }
    ]
  }]
});

// 3. Parse coordinates and crop logo
// 4. Return extracted logo URL
```

---

### 4. Remove.bg (Background Removal)

**Purpose:** Remove background from uploaded images

**Integration Points:**
- `backgroundRemovalService.ts`

**Flow:**
```javascript
const formData = new FormData();
formData.append('image_file', imageBuffer);
formData.append('size', 'auto');

const response = await fetch('https://api.remove.bg/v1.0/removebg', {
  method: 'POST',
  headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
  body: formData
});
```

---

### 5. Supabase Storage

**Purpose:** Cloud file storage for images, logos, designs

**Integration Points:**
- `supabaseStorage.ts` - Storage service
- `/api/uploads/*` - Upload endpoints

**Buckets:**
- `stolentee-uploads` - User-uploaded files
- `stolentee-assets` - Product images

**Flow:**
```javascript
// 1. Get signed URL
const { data } = await supabase.storage
  .from('stolentee-uploads')
  .createSignedUploadUrl(`uploads/${fileName}`);

// 2. Upload file from client
await fetch(signedUrl, {
  method: 'PUT',
  body: file
});

// 3. Get public URL
const publicUrl = supabase.storage
  .from('stolentee-uploads')
  .getPublicUrl(filePath);
```

---

## Queue Architecture

### Bull Queue (Redis-backed)

**Purpose:** Process long-running background jobs asynchronously

**Queues:**
```
┌─────────────────────────────────────────────┐
│          LOGO_EXTRACTION_QUEUE              │
├─────────────────────────────────────────────┤
│  Job Type: logo_extraction                  │
│  Rate Limit: 10 jobs/hour (per user)       │
│  Timeout: 5 minutes                         │
│  Retry: 3 attempts with exponential backoff │
│                                             │
│  Input:                                     │
│  • image_url: string                        │
│  • user_id: string                          │
│                                             │
│  Output:                                    │
│  • extracted_logo_url: string               │
│  • confidence: number                       │
│  • coordinates: { x, y, width, height }     │
└─────────────────────────────────────────────┘
```

**Worker Architecture:**
```javascript
// backend/src/workers/logoExtractionWorker.ts

queue.process('logo_extraction', async (job) => {
  const { image_url, user_id } = job.data;

  // Update progress
  await job.progress(10);

  // Step 1: Download image
  const imageBuffer = await downloadImage(image_url);
  await job.progress(30);

  // Step 2: Extract logo with Gemini AI
  const extractedLogo = await geminiService.extractLogo(imageBuffer);
  await job.progress(70);

  // Step 3: Remove background
  const finalLogo = await backgroundRemoval.process(extractedLogo);
  await job.progress(90);

  // Step 4: Upload to storage
  const logoUrl = await storage.upload(finalLogo);
  await job.progress(100);

  return { extracted_logo_url: logoUrl, confidence: 0.95 };
});
```

**Job States:**
- `pending` - Queued
- `active` - Processing
- `completed` - Finished successfully
- `failed` - Error occurred
- `delayed` - Scheduled for later
- `stuck` - Timeout exceeded

---

## Authentication Flow

### JWT-based Authentication

```
┌─────────┐                                    ┌──────────┐
│ Browser │  POST /api/auth/login             │   API    │
│         │ ──────────────────────────────────►│          │
│         │  { email, password }               │          │
│         │                                    └────┬─────┘
│         │                                         │
│         │                                         ▼
│         │                                  ┌──────────────┐
│         │                                  │ authService  │
│         │                                  │ • Verify pwd │
│         │                                  │ • Generate   │
│         │                                  │   JWT token  │
│         │                                  └──────┬───────┘
│         │                                         │
│         │ ◄───────────────────────────────────────┘
│         │  { token: "eyJhbGci...", user }
│         │
│  Store  │  localStorage.setItem('token', jwt)
│  Token  │
│         │
│         │  GET /api/designs
│         │  Authorization: Bearer eyJhbGci...
│         │ ──────────────────────────────────► API
│         │                                    │
│         │                                    ▼
│         │                              ┌──────────────┐
│         │                              │ auth middleware
│         │                              │ • Verify JWT │
│         │                              │ • Decode user│
│         │                              └──────┬───────┘
│         │                                     │
│         │                                     ▼
│         │                              ┌──────────────┐
│         │                              │  Controller  │
│         │                              │ req.user = {...}
│         │ ◄────────────────────────────└──────────────┘
│         │  { designs: [...] }
└─────────┘
```

**JWT Payload:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1700000000,
  "exp": 1700604800
}
```

**Token Expiration:** 7 days (configurable via `JWT_EXPIRES_IN`)

---

## Deployment Architecture

### Production Infrastructure

```
┌───────────────────────────────────────────────────────────────┐
│                         INTERNET                               │
└────────────┬──────────────────────────────────┬───────────────┘
             │                                  │
             ▼                                  ▼
    ┌────────────────┐                 ┌────────────────┐
    │  Vercel CDN    │                 │  Railway       │
    │  (Frontend)    │                 │  (Backend API) │
    │                │                 │                │
    │  • React App   │                 │  • Express.js  │
    │  • Static      │                 │  • Node.js     │
    │    Assets      │                 │  • Auto-deploy │
    │  • SSR Ready   │                 │    from GitHub │
    └────────┬───────┘                 └───────┬────────┘
             │                                 │
             └──────────┬──────────────────────┘
                        │
           ┌────────────┼────────────┬─────────────────┐
           │            │            │                 │
           ▼            ▼            ▼                 ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐    ┌──────────┐
    │ Supabase │ │ Supabase │ │ Upstash  │    │  Stripe  │
    │PostgreSQL│ │ Storage  │ │  Redis   │    │   API    │
    │          │ │          │ │          │    │          │
    │ • Users  │ │ • Images │ │ • Queue  │    │ • Payment│
    │ • Orders │ │ • Logos  │ │ • Cache  │    │          │
    └──────────┘ └──────────┘ └──────────┘    └──────────┘
```

**Hosting Details:**

| Component | Platform | Plan | Auto-Deploy |
|-----------|----------|------|-------------|
| Frontend | Vercel | Hobby (Free) | Yes (main branch) |
| Backend API | Railway | Hobby ($5/mo) | Yes (main branch) |
| Database | Supabase | Free Tier | Manual migrations |
| Storage | Supabase | Free Tier | N/A |
| Redis | Upstash | Serverless | N/A |
| Payments | Stripe | Pay-as-you-go | N/A |

**Environment Variables:**
- Frontend: `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`
- Backend: See `.env.example` for full list

---

## Security Architecture

### Layers of Security

```
┌─────────────────────────────────────────────────┐
│  1. Network Layer                               │
│     • HTTPS/TLS encryption                      │
│     • CORS whitelist                            │
│     • Helmet security headers                   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  2. Application Layer                           │
│     • Rate limiting (100 req/15min)             │
│     • Input validation                          │
│     • SQL injection prevention (parameterized)  │
│     • XSS prevention (sanitization)             │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  3. Authentication Layer                        │
│     • JWT tokens (7-day expiry)                 │
│     • bcrypt password hashing (10 rounds)       │
│     • Role-based access control                 │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  4. Data Layer                                  │
│     • Database connection pooling               │
│     • Encrypted environment variables           │
│     • Secure file storage (Supabase)            │
└─────────────────────────────────────────────────┘
```

---

## Performance Optimization

### Frontend
- **Code Splitting:** Lazy-loaded routes via React Router
- **Image Optimization:** WebP format, lazy loading
- **Caching:** Service Worker for static assets
- **Bundle Size:** Tree-shaking, minification (Vite)

### Backend
- **Database:** Connection pooling (pg.Pool)
- **Caching:** Redis for session/job data
- **Static Files:** CDN via Supabase Storage
- **Compression:** gzip middleware

### Monitoring
- **Uptime:** UptimeRobot (external monitoring)
- **Errors:** Sentry error tracking
- **Logs:** Structured logging (Winston)
- **Metrics:** Railway built-in metrics

---

## Scalability Considerations

### Current Limitations
- Single Railway instance (no horizontal scaling yet)
- Supabase free tier (500MB limit)
- Redis memory limit

### Future Scaling Path
```
Phase 1: Current (0-1000 users)
  ├── Single Railway instance
  ├── Supabase free tier
  └── Upstash Redis

Phase 2: Growth (1000-10000 users)
  ├── Railway Pro (auto-scaling)
  ├── Supabase Pro ($25/mo)
  └── Redis with more memory

Phase 3: Enterprise (10000+ users)
  ├── Kubernetes cluster
  ├── Dedicated PostgreSQL
  ├── Redis cluster
  └── CDN for all assets
```

---

## Disaster Recovery

### Backup Strategy
- **Database:** Supabase automated daily backups (7-day retention)
- **Files:** Supabase Storage redundancy
- **Code:** GitHub version control

### Recovery Plan
1. Database: Restore from Supabase backup
2. Files: Re-upload from local backups
3. Code: Redeploy from GitHub

**RTO (Recovery Time Objective):** 1 hour
**RPO (Recovery Point Objective):** 24 hours

---

## Related Documentation

- [API Documentation](./API.md) - Complete API reference
- [Setup Guide](./SETUP.md) - Local development setup
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues

---

**Last Updated:** 2025-11-26
**Maintainer:** StolenTee Development Team
