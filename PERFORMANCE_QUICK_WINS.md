# PERFORMANCE QUICK WINS - DO THESE FIRST

**Total Time:** ~4 hours
**Total Impact:** 40-50% performance improvement

---

## 1. ADD LAZY LOADING TO IMAGES (30 minutes)

**Impact:** ⭐⭐⭐⭐⭐ CRITICAL
**Effort:** ⭐ Very Easy

### Files to Update:

**frontend/src/pages/Home.tsx:**
```typescript
// Line 72-76
<img
  src="/assets/hero-bg.jpg"
  alt="Stolen Art"
  loading="lazy"  // ADD THIS
  className="w-full h-full object-cover"
/>
```

**frontend/src/pages/Dashboard.tsx:**
```typescript
// Line 162-174
{design.thumbnail_url && (
  <img
    src={design.thumbnail_url}
    alt={design.name}
    loading="lazy"  // ADD THIS
    className="relative w-full h-full object-contain bg-white"
  />
)}
```

**frontend/src/pages/Products.tsx:**
- Add `loading="lazy"` to all product images

**frontend/src/pages/Cart.tsx:**
- Add `loading="lazy"` to all cart item images

**frontend/src/pages/CaseStudies.tsx:**
- Add `loading="lazy"` to all case study images

**Expected Result:**
- 50-70% faster initial page load
- Better Core Web Vitals (LCP)
- Reduced bandwidth usage

---

## 2. ADD COMPRESSION MIDDLEWARE (15 minutes)

**Impact:** ⭐⭐⭐⭐ High
**Effort:** ⭐ Very Easy

### Backend Changes:

```bash
cd backend
npm install compression
```

**backend/src/index.ts (add after line 5):**
```typescript
import compression from 'compression';

// Add after helmet middleware (around line 44)
app.use(compression());
```

**Expected Result:**
- 70-80% smaller JSON responses
- Faster API responses
- Reduced bandwidth costs

---

## 3. LAZY LOAD CANVAS LIBRARIES (1 hour)

**Impact:** ⭐⭐⭐⭐⭐ CRITICAL
**Effort:** ⭐⭐ Medium

### File: frontend/src/components/Customizer.tsx

**Lines 7-8 - CHANGE FROM:**
```typescript
import TShirtCanvas from './TShirtCanvas';
import HoodieCanvas from './HoodieCanvas';
```

**TO:**
```typescript
import { lazy, Suspense } from 'react';

const TShirtCanvas = lazy(() => import('./TShirtCanvas'));
const HoodieCanvas = lazy(() => import('./HoodieCanvas'));
```

**Lines 669-726 - WRAP CANVAS IN SUSPENSE:**
```typescript
<div className="h-full flex items-center justify-center pt-4 pb-12 px-4">
  <Suspense fallback={
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  }>
    {product.slug === 'classic-hoodie' ? (
      <HoodieCanvas
        ref={canvasRef}
        // ... props
      />
    ) : (
      <TShirtCanvas
        ref={canvasRef}
        // ... props
      />
    )}
  </Suspense>
</div>
```

**Expected Result:**
- Defer 276KB canvas bundle until user starts customizing
- 60% faster initial page load for Customizer
- Better perceived performance

---

## 4. ADD REACT.MEMO TO COMPONENTS (2 hours)

**Impact:** ⭐⭐⭐⭐ High
**Effort:** ⭐⭐ Medium

### Components to Wrap:

**frontend/src/components/Toast.tsx:**
```typescript
import { memo } from 'react';

// CHANGE FROM:
export default function Toast({ message, type, onClose }: ToastProps) {
  // ...
}

// TO:
const Toast = ({ message, type, onClose }: ToastProps) => {
  // ...
};

export default memo(Toast);
```

**Apply same pattern to:**
1. `frontend/src/components/SaveDesignModal.tsx`
2. `frontend/src/components/PaymentRequestButton.tsx`
3. `frontend/src/components/TShirtCanvas.tsx`
4. `frontend/src/components/HoodieCanvas.tsx`
5. `frontend/src/components/Layout.tsx`
6. `frontend/src/components/ProtectedRoute.tsx`

**Expected Result:**
- 30-50% fewer re-renders
- Smoother UI interactions
- Better performance on slower devices

---

## 5. ADD USEMEMO TO CUSTOMIZER (Bonus - 30 minutes)

**Impact:** ⭐⭐⭐ Medium
**Effort:** ⭐ Easy

### File: frontend/src/components/Customizer.tsx

**Lines 95-100 - CHANGE FROM:**
```typescript
const unitCost = calculateUnitCost(
  frontArtworks.length > 0,
  backArtworks.length > 0,
  false,
  TSHIRT_BASE_PRICE
);
```

**TO:**
```typescript
const unitCost = useMemo(
  () => calculateUnitCost(
    frontArtworks.length > 0,
    backArtworks.length > 0,
    false,
    TSHIRT_BASE_PRICE
  ),
  [frontArtworks.length, backArtworks.length]
);
```

**Expected Result:**
- Prevent unnecessary price recalculations
- Smoother UI updates
- Better performance during customization

---

## TESTING CHECKLIST

After implementing each optimization:

### Test 1: Lazy Loading Images
- [ ] Open Home page
- [ ] Open DevTools Network tab
- [ ] Verify images load only when scrolled into view
- [ ] Verify page loads faster (check LCP in Lighthouse)

### Test 2: Compression
- [ ] Open DevTools Network tab
- [ ] Make API call (e.g., load designs)
- [ ] Verify response has `Content-Encoding: gzip` header
- [ ] Verify smaller response size

### Test 3: Lazy Canvas
- [ ] Navigate to /products/classic-tee
- [ ] Open DevTools Network tab
- [ ] Verify canvas-vendor.js is NOT loaded initially
- [ ] Start customizing
- [ ] Verify canvas-vendor.js loads only when needed

### Test 4: React.memo
- [ ] Open React DevTools Profiler
- [ ] Interact with components
- [ ] Verify fewer re-renders (check "Commits" tab)

---

## DEPLOYMENT STRATEGY

### Step 1: Test Locally
```bash
# Frontend
cd frontend
npm run build
npm run preview

# Backend
cd backend
npm run build
npm start
```

### Step 2: Deploy to Staging
```bash
# Test on Railway preview environment
git checkout -b performance-optimizations
git add .
git commit -m "Add critical performance optimizations"
git push origin performance-optimizations
```

### Step 3: Monitor Performance
- Run Lighthouse audit (before and after)
- Check bundle sizes (`npm run build`)
- Monitor API response times
- Check Core Web Vitals

### Step 4: Deploy to Production
```bash
git checkout main
git merge performance-optimizations
git push origin main
```

---

## EXPECTED RESULTS

### Before Optimizations:
```
Page Load (3G):        3.8s
Time to Interactive:   1.3s
Bundle Size:           728KB
LCP:                   2.5s
API Response Size:     ~200KB (uncompressed)
```

### After Quick Wins:
```
Page Load (3G):        2.3s ⬇️ 40% improvement
Time to Interactive:   500ms ⬇️ 62% improvement
Bundle Size:           728KB (but deferred)
LCP:                   1.8s ⬇️ 28% improvement
API Response Size:     ~50KB ⬇️ 75% improvement (gzipped)
```

### Performance Score:
```
Before:  72/100 (Lighthouse)
After:   85-90/100 (Lighthouse)
```

---

## ROLLBACK PLAN

If any optimization causes issues:

### 1. Revert Lazy Loading
```bash
git revert <commit-hash>
```

### 2. Disable Compression
```typescript
// Comment out in backend/src/index.ts
// app.use(compression());
```

### 3. Revert Canvas Lazy Loading
```bash
# Restore original imports
git checkout HEAD -- frontend/src/components/Customizer.tsx
```

---

## NEXT STEPS (After Quick Wins)

Once quick wins are deployed:

1. **Implement React Query** (4 hours)
   - Install: `npm install @tanstack/react-query`
   - Wrap app with QueryClientProvider
   - Refactor API calls to use useQuery

2. **Consolidate Canvas Libraries** (8 hours)
   - Remove fabric.js
   - Use only konva
   - Refactor TShirtCanvas and HoodieCanvas

3. **Convert Images to WebP** (3 hours)
   - Install: `npm install sharp imagemin-webp`
   - Create optimization script
   - Update image references

---

**Total Quick Wins Time:** ~4 hours
**Total Impact:** 40-50% performance improvement
**Risk:** Very Low (all are non-breaking changes)
**Priority:** CRITICAL (do this week)
