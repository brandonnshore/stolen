# How Admin Access Works - Stolen Tee

## 🔐 Security System (What You Already Have)

### 3-Layer Security Protection:

```
Customer tries to access /admin
  ↓
Layer 1: Is user logged in? ❌ → Redirect to login
  ↓ YES ✅
Layer 2: Is user.role = 'admin'? ❌ → Show "Access Denied"
  ↓ YES ✅
Layer 3: Backend verifies admin role ✅ → Show admin page
```

---

## 👤 User Roles in Your Database

Your `users` table has a `role` column:

| Email | Name | Role | Can Access Admin? |
|-------|------|------|-------------------|
| customer@gmail.com | John Doe | **customer** | ❌ NO |
| brandon@stolentee.com | Brandon | **admin** | ✅ YES |
| fulfillment@stolentee.com | Staff | **fulfillment** | ⚠️ Optional |

---

## 🌐 How URLs Work

### Customer Pages (Anyone Can Access):
```
https://stolentee.com/                    → Homepage
https://stolentee.com/products            → Browse products
https://stolentee.com/products/t-shirt    → Product detail
https://stolentee.com/checkout            → Checkout
```

### Customer Account (Must Be Logged In):
```
https://stolentee.com/dashboard           → Customer's saved designs
https://stolentee.com/orders              → Customer's order history
```

### Admin Panel (Must Be Admin Role):
```
https://stolentee.com/admin               → Admin dashboard
https://stolentee.com/admin/orders        → View all orders
https://stolentee.com/admin/products      → Manage products
https://stolentee.com/admin/customers     → View customers
```

**Key Point:** It's the SAME website, just different URLs!

---

## 🚫 What Happens When a Customer Tries to Access Admin?

### Scenario 1: Customer Types `stolentee.com/admin`

```javascript
// Frontend checks user.role
if (user.role !== 'admin') {
  // Show this:
  "Access Denied. Admin privileges required."
  // Or redirect to homepage
}
```

### Scenario 2: Customer Tries API Directly

```bash
# Customer tries to get orders via API:
curl https://stolentee-backend-production.up.railway.app/api/admin/orders

# Backend responds:
{
  "status": "fail",
  "message": "Insufficient permissions - requires admin role"
}
```

**The backend DOUBLE-CHECKS** - even if they bypass the frontend!

---

## 🔑 How to Create an Admin User

### Option 1: Using Supabase SQL Editor (Easiest)

1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/sql/new

2. Run this SQL:
```sql
-- Create a new admin user (replace with your info)
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'brandon@stolentee.com',
  -- Password: "YourSecurePassword123" (you need to hash this first!)
  'HASHED_PASSWORD_HERE',
  'Brandon Shore',
  'admin'
);
```

**Problem:** You need to hash the password first.

### Option 2: Using Your Registration Endpoint (Better)

1. Register normally at `stolentee.com/register`
2. Then update your role in Supabase:

```sql
-- Update your account to admin
UPDATE users
SET role = 'admin'
WHERE email = 'your@email.com';
```

### Option 3: Create Script (Best - I'll Make This For You)

```bash
# Run this script:
npm run create-admin
# Enter email, password, name
# Automatically creates admin user with proper password hashing
```

---

## 🛡️ How the Frontend Blocks Access

### Example: Protected Admin Route

```typescript
// In your React Router:
<Route
  path="/admin"
  element={
    <RequireAuth>
      <RequireAdmin>
        <AdminDashboard />
      </RequireAdmin>
    </RequireAuth>
  }
/>

// RequireAuth: Checks if logged in
// RequireAdmin: Checks if role = 'admin'
```

### Component Code:
```typescript
function RequireAdmin({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>You need admin privileges to access this page.</p>
      </div>
    );
  }

  return children;
}
```

---

## 🛡️ How the Backend Blocks Access

### In Your Admin Routes:
```typescript
// backend/src/routes/admin.ts
router.use(authenticate);        // Must be logged in
router.use(authorize('admin'));  // Must have admin role

router.get('/orders', getAllOrders);  // ✅ Protected!
```

### What Happens:
```
Request → /api/admin/orders
  ↓
authenticate(): Checks JWT token
  ↓ Valid ✅
authorize('admin'): Checks user.role = 'admin'
  ↓ YES ✅
getAllOrders(): Returns data
```

If customer tries:
```
Request → /api/admin/orders
  ↓
authenticate(): Checks JWT token
  ↓ Valid ✅ (customer is logged in)
authorize('admin'): Checks user.role = 'admin'
  ↓ NO ❌ (customer.role = 'customer', not 'admin')
Response: 403 Forbidden
{
  "status": "fail",
  "message": "Insufficient permissions - requires admin"
}
```

---

## 🎯 Real-World Example

### Customer Journey:
```
1. Brandon creates account → role = 'customer' (default)
2. Brandon browses products → ✅ Allowed
3. Brandon tries /admin → ❌ "Access Denied"
4. Brandon tries API /api/admin/orders → ❌ 403 Forbidden
```

### Your Journey (Admin):
```
1. You create account → role = 'customer' (default)
2. You update database: role = 'admin'
3. You browse products → ✅ Allowed
4. You go to /admin → ✅ Admin Dashboard shows!
5. You view all orders → ✅ Works!
```

---

## 🔍 How to Hide Admin Link from Customers

### In Your Navigation:
```typescript
function Navigation() {
  const { user } = useAuth();

  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/products">Products</Link>

      {user && (
        <Link to="/dashboard">My Account</Link>
      )}

      {/* Only show admin link if user is admin */}
      {user?.role === 'admin' && (
        <Link to="/admin">Admin Panel</Link>
      )}
    </nav>
  );
}
```

**Result:**
- Regular customers: Don't even SEE the admin link
- You (admin): See the admin link in navigation

---

## 🌐 How Other Sites Do It

### Shopify:
```
mystore.myshopify.com          → Customer store
mystore.myshopify.com/admin    → Admin panel (hidden from customers)
```

### WordPress/WooCommerce:
```
mystore.com              → Customer store
mystore.com/wp-admin     → Admin panel (login required)
```

### Amazon Seller Central:
```
amazon.com                      → Customer site
sellercentral.amazon.com        → Seller admin (separate site)
```

### Stolen Tee (You):
```
stolentee.com            → Customer store
stolentee.com/admin      → Your admin panel (role-protected)
```

**Your approach is most like Shopify!**

---

## ✅ Security Checklist

- [x] Backend has authentication (JWT tokens)
- [x] Backend has authorization (role checking)
- [x] Admin routes require 'admin' role
- [x] Frontend has user context with role
- [ ] Frontend admin page exists ← **WE NEED TO ADD THIS**
- [ ] Frontend blocks non-admins from /admin ← **WE NEED TO ADD THIS**
- [ ] You have an admin user in database ← **YOU NEED TO CREATE THIS**

---

## 🚀 Next Steps

### 1. Create Your Admin User (5 minutes)

**Easiest way:**
```sql
-- In Supabase SQL Editor:
-- First, register normally at stolentee.com/register
-- Then run this to make yourself admin:
UPDATE users
SET role = 'admin'
WHERE email = 'YOUR_EMAIL_HERE';
```

### 2. Build Admin Page (I can do this for you - 30 min)

Create:
- `/admin` route
- `RequireAdmin` component to protect it
- Simple admin dashboard showing orders

### 3. Test It

```
✅ Log in as regular user → Try /admin → Should see "Access Denied"
✅ Log in as admin → Try /admin → Should see admin dashboard
✅ Try API as customer → Should get 403 Forbidden
✅ Try API as admin → Should work
```

---

## 💡 Summary

**How customers are blocked:**
1. Frontend checks `user.role` - hides admin links
2. Frontend blocks `/admin` route - shows error message
3. Backend verifies role - returns 403 error

**How you access admin:**
1. Your database account has `role = 'admin'`
2. Frontend sees you're admin - shows admin link
3. Frontend lets you access `/admin` route
4. Backend sees you're admin - allows API calls

**It's like a VIP club:**
- Regular customers: Can't even see the door
- You (admin): Have the VIP badge, door opens automatically

---

Want me to:
1. Build the admin page for you?
2. Create a script to make your first admin user?
3. Both?
