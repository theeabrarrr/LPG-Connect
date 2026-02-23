# Phase 2.2: Admin Approvals Dashboard
**Implementation Plan & Discovery Report**

## 1. Discovery Report

### Codebase Verification
I have scanned the `/src` directory for the Admin Approval and Handover Management components. 
- `src/app/(dashboard)/admin/handovers/page.tsx` **DOES NOT EXIST**.
- `src/app/(dashboard)/admin/finance/approvals/page.tsx` **DOES NOT EXIST**.
- `src/app/(dashboard)/admin/approvals/page.tsx` **EXISTS** as a functional "Reconciliation Hub".
- `src/app/(dashboard)/admin/finance/handovers/page.tsx` **EXISTS** as a simpler specific dashboard for Cash Handovers.
- `src/app/actions/handoverActions.ts` **EXISTS** and contains logic for approvals and rejections.

### Reconciliation against Master Documents
Comparing the existing code to PRD Sections 4.1/4.5 and GAP_ANALYSIS Section 2.2:

1. **Transaction Integrity (`cash_book_entries`)**: 
   - ✅ **Verified.** The RPC `execute_handover_approval` handles the atomic transaction perfectly. It locks the record, updates the handover status, deducts funds from the driver's `employee_wallets`, and inserts a `cash_in` record into `cash_book_entries`.
2. **Proof Image Viewer**: 
   - ✅ **Verified.** `admin/approvals/page.tsx` utilizes a generic Lightbox (Radix Dialog with Next.js Image/img tag) to view the `proof_url`. `admin/finance/handovers/page.tsx` relies on a reusable `<HandoverProofDialog>` component.
3. **Wallet Balance Real-Time Updates**:
   - ✅ **Verified.** The RPC updates the DB in real-time. The UI pages (`admin/finance/handovers/page.tsx` and `admin/approvals/page.tsx`) perform optimistic UI updates out-of-the-box and revalidate the paths.
4. **Status Filters (Pending, Approved, Rejected) & Date/Driver Filters**:
   - 🔴 **GAP DETECTED.** In both existing UI pages, the server actions call strictly `getPendingHandovers()` which enforces `.eq('status', 'pending')`. There is **no UI mechanism** on these dashboards to filter by Status, Date, or Driver. You can only view and interact with *Pending* items.

---

## 2. Implementation Plan

Based on the discovery, the dashboard exists and functions well for "Pending" tasks, but lacks the necessary filters and history views specified in GAP_ANALYSIS. The plan will focus on **REFACTORING and FIXING GAPS**.

### Step 1: Consolidate Redundant Dashboards
- Currently, there are two pages doing identical tracking: `admin/finance/handovers/page.tsx` and `admin/approvals/page.tsx`.
- **Action**: Make `admin/approvals/page.tsx` the primary "Reconciliation Hub". We will route Handover management there and potentially redirect or remove the redundant finance/handovers page if it causes confusion, or modify the redundant one to be a pure "Handover History" page. *Let's adapt `admin/approvals/page.tsx` to include tabs for Pending vs History.*

### Step 2: Extend Server Actions
- Update `src/app/actions/adminActions.ts` or `src/app/actions/handoverActions.ts`.
- Create a new robust fetch function: `getHandovers(filters: { status: string, driverId?: string, startDate?: string, endDate?: string })`. This function will securely fetch records dynamically rather than hardcoding `'pending'`.

### Step 3: Implement Filtering UI
- In `src/app/(dashboard)/admin/approvals/page.tsx` (or a dedicated history tab):
  - Add a **Tabs Component** to toggle between [Pending Verifications] and [History / Processed].
  - Add a **Filter Bar** with:
    1. Driver Dropdown
    2. Status Dropdown (Approved, Rejected)
    3. Date Range Picker
- Render the historical items below standard list visuals.

### Step 4: Add Export Functionality
- Add "Export to Excel/CSV" buttons using PapaParse for the Historical data view.

## 3. Verification Plan
- **Manual UI Check**: Ensure the new Tabs are visible and clicking "History" displays processed handovers.
- **Filter Tests**: Select a specific driver in the filter bar and verify only that driver's handovers appear. Check Date filters similarly.
- **Atomic Process Verification**: Approve a pending item and immediately switch to the History tab to confirm its status flipped to 'verified' and it is removed from the Pending tab.

*Awaiting your review to begin execution.*
