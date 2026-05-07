# Admin Panel Structure & Navigation

## Overview
The admin panel uses **React Router v6** with nested routing under the `/admin/*` path. It's protected by role-based access control requiring `role: 'admin'`.

---

## 1. Routing Architecture

### Main App Routes (App.jsx)
```javascript
// Entry point for admin panel
<Route path="/admin" element={<AdminPage />} />

// Protected admin panel with nested routes
<Route
  path="/admin/*"
  element={(
    <ProtectedRoute requireAdmin>
      <AdminLayout />
    </ProtectedRoute>
  )}
>
  <!-- Nested routes defined below -->
</Route>
```

### Access Control (ProtectedRoute.jsx)
- **Requirement**: `requireAdmin` prop + `user?.role === 'admin'`
- **Redirect on failure**: Non-admins → `/candidate-dashboard`, non-authenticated → `/admin` (login page)

### Admin Nested Routes
```javascript
// Dashboard
<Route path="dashboard" element={<AdminDashboardPage />} />

// Candidate Management
<Route path="candidates" element={<AdminCandidatesPage />} />
<Route path="candidates/:id" element={<AdminCandidateProfilePage />} />
<Route path="candidate/:id" element={<AdminCandidateProfilePage />} />
<Route path="candidate/:id/edit" element={<AdminCandidatePage />} />

// Pipeline Stages (all use AdminStageCandidatesPage with stageKey prop)
<Route path="evaluation" element={<AdminStageCandidatesPage title="Internal Evaluation" stageKey="evaluation" />} />
<Route path="document-verification" element={<AdminStageCandidatesPage title="Document Verification" stageKey="document-verification" />} />
<Route path="hiring" element={<AdminStageCandidatesPage title="Hiring Partner Stage" stageKey="hiring" />} />
<Route path="interviews" element={<AdminStageCandidatesPage title="Interviews" stageKey="interviews" />} />
<Route path="selection" element={<AdminStageCandidatesPage title="Selection Results" stageKey="selection" />} />
<Route path="testimonials" element={<AdminStageCandidatesPage title="Testimonials" stageKey="testimonials" />} />

// Payments (all use AdminPaymentTypePage with type prop)
<Route path="payments" element={<AdminPaymentsOverviewPage />} />
<Route path="payments/initial" element={<AdminPaymentTypePage title="Initial Payment ($500)" type="initial" />} />
<Route path="payments/program" element={<AdminPaymentTypePage title="Program Payment ($3500)" type="program" />} />
<Route path="payments/final" element={<AdminPaymentTypePage title="Final Payment ($4000)" type="final" />} />

// Fallback
<Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
```

---

## 2. Layout Structure

### AdminLayout.jsx
The main wrapper component for all admin pages with:
- **Sidebar**: `<AdminSidebar />` - Fixed left navigation (responsive)
- **Header**: Sticky top bar with admin branding, current user info, mobile menu toggle
- **Main Content**: Dynamic content area via `<Outlet />`
- **Features**:
  - Mobile hamburger menu
  - Admin user profile display with avatar initial
  - Admin role badge
  - Gradient background

```jsx
<div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc,#eef2f7)]">
  <AdminSidebar /> {/* Fixed sidebar */}
  <div className="lg:pl-72"> {/* Main content with padding */}
    {/* Mobile menu button */}
    <header> {/* Sticky header */}
      {/* User info */}
    </header>
    <main>
      <Outlet /> {/* Route-specific content */}
    </main>
  </div>
</div>
```

---

## 3. Navigation System

### AdminSidebar.jsx
- **Type**: Responsive sidebar with mobile overlay
- **Components**:
  - **Logo section**: "Admin Console" header
  - **Pipeline nav**: Main menu items (Dashboard, Candidates, pipeline stages)
  - **Payments collapsible**: Expandable payments submenu
  - **Logout button**: Red button at bottom

### Navigation Data (adminNav.js)

#### adminMainNav
```javascript
[
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Candidates', to: '/admin/candidates' },
  { label: 'Internal Evaluation', to: '/admin/evaluation' },
  { label: 'Document Verification', to: '/admin/document-verification' },
  { label: 'Hiring Partner Stage', to: '/admin/hiring' },
  { label: 'Interviews', to: '/admin/interviews' },
  { label: 'Selection Results', to: '/admin/selection' },
  { label: 'Testimonials', to: '/admin/testimonials' },
]
```

#### adminPaymentNav
```javascript
[
  { label: 'Overview', to: '/admin/payments' },
  { label: 'Initial Payment ($500)', to: '/admin/payments/initial' },
  { label: 'Program Payment ($3500)', to: '/admin/payments/program' },
  { label: 'Final Payment ($4000)', to: '/admin/payments/final' },
]
```

### Navigation Features (AdminSidebar.jsx)
- **Active link styling**: NavLink highlights active route with blue background
- **Payments dropdown**: Collapsible section managed by state (`paymentsOpen`, `setPaymentsOpen`)
- **Mobile responsiveness**: 
  - Overlay backdrop on mobile
  - Translate animation (`-translate-x-full` → `translate-x-0`)
  - Auto-close on link click
- **Responsive breakpoint**: `lg:` breakpoint handles desktop/mobile transition

### Sidebar State (AdminLayout.jsx)
```jsx
const [paymentsOpen, setPaymentsOpen] = useState(false);
const [mobileOpen, setMobileOpen] = useState(false);
```

---

## 4. Page Organization

### Pages Directory Structure
```
frontend/src/pages/
├── AdminPage.jsx                 // Admin login page (entry point)
└── admin/                        // Protected admin pages
    ├── AdminDashboardPage.jsx         // Dashboard with KPIs
    ├── AdminCandidatesPage.jsx        // Candidate list with filtering
    ├── AdminCandidateProfilePage.jsx  // Individual candidate profile
    ├── AdminCandidateDetailPage.jsx   // Detailed candidate view
    ├── AdminStageCandidatesPage.jsx   // Reusable page for pipeline stages
    ├── AdminPaymentsOverviewPage.jsx  // Payment summary dashboard
    └── AdminPaymentTypePage.jsx       // Individual payment type details
```

### Component Organization
```
frontend/src/components/admin/
├── AdminLayout.jsx              // Main layout wrapper
├── AdminSidebar.jsx             // Navigation sidebar
├── adminNav.js                  // Navigation config
├── AdminCandidateTable.jsx      // Candidate list table
├── ApprovalReviewModal.jsx      // Review/approval modal
└── AuditHistoryPanel.jsx        // Audit trail viewer
```

---

## 5. Admin API Service

### File: api/adminApi.js

#### Available API Endpoints
```javascript
// Candidates
fetchAdminCandidates(params)              // GET /admin/candidates/all
fetchAdminCandidateProfile(id)            // GET /admin/candidates/{id}/profile

// Dashboard
fetchAdminDashboardSummary()              // GET /admin/dashboard/summary

// Approval & Audit
fetchApprovalAuditHistory(candidateId)    // GET /admin/approval-audit/{candidateId}

// Reviews & Decisions
reviewCandidateProfile(candidateId, payload)           // PUT /admin/candidates/{id}/profile-status
reviewCandidateDocument(candidateId, documentId, payload)  // PUT /admin/candidates/{id}/documents/{docId}/status
reviewPayment(paymentId, payload)                      // PUT /admin/payments/{paymentId}/status
reviewCandidateStage(candidateId, stageKey, payload)   // PUT /admin/candidates/{id}/stage/{stageKey}/decision

// Notes
updateCandidateNotes(candidateId, payload)             // PUT /admin/candidates/{id}/notes
```

---

## 6. Key Features by Page

### AdminDashboardPage
- **8 KPI cards** with drill-down links:
  - Total Candidates
  - Eligible Candidates
  - Profiles Pending Review
  - Payments Pending Verification
  - Documents Pending Verification
  - Interviews Pending/Scheduled
  - Selected Candidates
  - Rejected Candidates
  - Total Revenue
- **Recent Activities**: Recent applications & payments
- **Auto-refresh**: Uses callbacks for polling

### AdminCandidatesPage
- **Advanced filtering**:
  - Search by query (q)
  - Stage: `profile_review`, `initial_payment`, `document_verification`, `interviews`, `selection`, `final_payment`, `testimonial`
  - Profile Status
  - Payment Status
  - Document Status
  - Interview Status
  - Selection Status
  - Pending From admin
- **Pagination**: 20 items per page
- **URL-based state**: Filter parameters in search params

### AdminStageCandidatesPage
- **Reusable component** for all pipeline stages
- **Props**: `title` (display name), `stageKey` (backend stage identifier)
- **Displays**: Candidates at specific pipeline stage

### AdminPaymentsOverviewPage
- **Payment dashboard** showing all payment types
- **Summary metrics** for each payment type

### AdminPaymentTypePage
- **Filtered payment view** by type: `initial`, `program`, `final`
- **Payment verification UI**

---

## 7. Authentication Flow

### AdminPage.jsx (Login)
1. Check if already authenticated as admin → redirect to `/admin/dashboard`
2. Admin login form with email & password
3. Validate role is `admin` before setting auth token
4. Redirect to `/admin/dashboard` on success

### Session Persistence
- Auth token stored in AuthContext (from `context/AuthContext.jsx`)
- Revalidated on page refresh via axios interceptors
- Logout available in sidebar footer

---

## 8. Styling & UI

### Tailwind Conventions
- **Dark sidebar**: `bg-[linear-gradient(180deg,#020617,#0f172a)]`
- **Light background**: `bg-[linear-gradient(180deg,#f8fafc,#eef2f7)]`
- **Primary accent**: Blue (`blue-500`)
- **Danger actions**: Rose/red (`rose-500`)
- **Sidebar width**: 288px (`w-72`)

### Material Icons
- Uses Material Icons (e.g., `menu`, `expand_less`, `expand_more`)
- Integrated via `.material-symbols-outlined` class

---

## 9. Current Implementation Summary

| Feature | Implementation |
|---------|----------------|
| **Routing** | React Router v6 with nested routes |
| **State Management** | React Context (AuthContext), URL SearchParams |
| **Navigation** | Config-driven (adminNav.js) with responsive sidebar |
| **Access Control** | ProtectedRoute HOC checking `user.role === 'admin'` |
| **API Communication** | Axios with centralized adminApi.js |
| **Mobile Responsive** | Breakpoint at `lg:` with drawer overlay |
| **Page Reusability** | AdminStageCandidatesPage & AdminPaymentTypePage support multiple contexts via props |
| **Styling** | Tailwind CSS with gradient backgrounds |

