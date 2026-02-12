# Billing Module – Why It’s Confusing & How to Fix It

## Why it feels confusing today

### 1. **Two different “Create from Planning” flows**
- **Billing → Create from Planning** (`/billing/planning`): 3-step wizard (Draft/Audit → Final Check → Download PDF). You pick project/contractor/week, see a table, click “Send to Final Check” to create an invoice, then move to Final Check step, then Download PDF.
- **Invoice → All Bills → “Create from Planning”** (`/invoice/create-from-planning`): Single page. You pick week/project/contractor, select rows, click “Create Draft Bill”, then you’re sent to **Invoice Read** for that bill.

So the same idea (“bill from planning”) is done in two different places, with two different UIs and flows. That’s the main source of confusion.

### 2. **The “5 steps” are split across two places**
The real lifecycle of a bill is:

| Step | Backend stage   | Where it happens today |
|------|-----------------|-------------------------|
| 1    | Draft           | Billing wizard (Audit table) or Invoice Create from Planning |
| 2    | Audit Check     | Billing wizard only (AuditCheck table + “Send to Final Check”) |
| 3    | Final Check     | Billing wizard only (FinalCheck component) |
| 4    | Approval        | **Only** when you open a bill in **All Bills → Read** (BillingWorkflowStrip) |
| 5    | Payment / Paid  | Same Read page: “Record Payment” or “Download PDF” (marks paid) |

So steps 1–3 are in **Billing → Create from Planning**, and steps 4–5 are only on the **All Bills → open bill** page. No single screen shows “all 5 steps” or lets you do them in one place.

### 3. **All Bills (Invoice list) is overloaded**
- Many columns: Number, Contractor, Bill Type, Billing Stage, Date, Expired Date, Total, Paid, Status, Payment.
- Row actions: Show, Edit, Download, Record Payment, Delete.
- Header: Create from Planning, Add New Invoice.

So “All Bills” is both the list of every bill and the launch pad for two different create flows, and the actions (Record Payment, Download, etc.) are easy to miss or mix up with “status” and “payment” columns.

### 4. **Terms and places don’t match**
- “Draft”, “Audit Check”, “Final Check”, “Approval”, “Payment” are backend stages.
- “Status” (draft/pending/sent) and “Payment” (unpaid/paid/partially) are separate.
- “Record Payment” is for entering actual payments; “Download PDF” can also mark the bill as paid in your flow.

So draft / return / paid / record payment feel like they’re mixed together without one clear story.

---

## What “all 5 steps in one window” should mean

One **single flow** for “Create bill from planning” where, in **one screen** (or one wizard with clear steps), the user can:

1. **Select** project, contractor, week (and see only 100% completed work).
2. **Review & send** the draft (Audit Check) → creates the bill.
3. **Final check** (review items, adjustments, sign-off).
4. **Approve** (move to Approval stage).
5. **Download PDF** and/or **Record Payment** (move to Payment/Paid).

So: one entry point, one place where the full lifecycle is visible and actionable, and “All Bills” is just the list of bills (with simple, clear actions).

---

## Proposed design: one billing flow, one list

### A. Single entry: **Billing → Create from Planning**

- **One page or one wizard** that covers the full lifecycle for “from planning” bills.
- **Steps in one window** (e.g. vertical stepper or tabs, no redirect to All Bills mid-flow):

  1. **Select & review**  
     Project, contractor, week ending.  
     Table of 100% completed lines.  
     “Create draft & continue” → creates invoice and moves to step 2 (no redirect to Invoice Read).

  2. **Audit check**  
     Same bill: review lines, optional adjustments.  
     “Send to final check”.

  3. **Final check**  
     Same bill: final review, sign-off.  
     “Approve bill”.

  4. **Approve**  
     Same bill: confirm approval.  
     “Go to payment / download”.

  5. **Payment / PDF**  
     Same bill: “Download PDF” (and optionally auto-mark paid), “Record Payment” if you want to enter payment details.

- **Direct bills** (no planning): keep a separate, simple “Direct Bill” flow (single form → save as draft), and optionally open that bill in the same “bill detail” view used at the end of the from-planning flow.

So “all 5 steps” are in **one window** (one URL, one flow), not split between Billing and All Bills.

### B. **All Bills** = list only, clear actions

- **Purpose:** See all bills (draft, audit, final check, approved, paid) and do a few clear actions.
- **Columns (simplified):**  
  Number | Contractor | Type (From Planning / Direct) | Stage (Draft / Audit / Final Check / Approved / Payment) | Date | Total | Payment status | Actions  
  (drop redundant “Status” if it duplicates stage; keep one “Payment” or “Paid” concept.)
- **Row actions (simple):**
  - **Open** (or “View / Continue”) → opens the **same** “bill detail” flow used in Create from Planning (steps 2–5 for that bill).
  - **Record payment** (only when relevant).
  - **Download PDF**.
  - **Delete** (only when allowed by role).
- **Header:**  
  - One primary button: **“Create from Planning”** (goes to the new single flow above).  
  - One secondary: **“Direct Bill”** (ad-hoc invoice).

So “draft”, “return”, “paid”, “record payment” are not mixed randomly: they’re either **stage** (Draft → … → Payment) or **payment status** (unpaid/paid) and **one** “Record payment” action. One place, one story.

### C. **Billing menu (sidebar)**

- **Billing**
  - **Create from Planning** → single flow (all 5 steps in one window).
  - **Direct Bill** → simple form.
  - **All Bills** → list with simplified columns and actions above.

Remove duplicate “Create from Planning” from the Invoice area so there’s only one entry point under Billing.

### D. **Invoice Read / “Bill detail”**

- **One** “bill detail” view used by:
  - The new “Create from Planning” flow (steps 2–5).
  - “Open” from All Bills.
- This view shows:
  - **Workflow strip** for the 5 stages (Draft → Audit → Final Check → Approval → Payment) and lets the user advance (e.g. “Send to Final Check”, “Approve”, etc.).
  - **Record Payment** and **Download PDF** clearly placed (e.g. at top or in a clear “Payment” section).
- So whether you came from “Create from Planning” or “All Bills”, you see the same steps and the same actions. No hidden workflow only on one page.

---

## Summary of changes to make

| # | Change | Purpose |
|---|--------|--------|
| 1 | **Single “Create from Planning” flow** under Billing that does Draft → Audit → Final Check → Approve → Payment/PDF in **one window** (wizard or long page with steps). | All 5 steps in one place; no jumping to All Bills mid-flow. |
| 2 | **Remove** the duplicate “Create from Planning” from the Invoice (All Bills) header. | One entry point for “from planning” under Billing. |
| 3 | **Simplify All Bills** columns and row actions (Stage, one Open, Record payment, Download, Delete). | Clear list; no overload of “draft / return / paid / record payment”. |
| 4 | **Unify “bill detail”**: same view for “continue from Create from Planning” and “Open” from All Bills, with workflow strip + Record Payment + Download PDF. | Same mental model whether you create or open a bill. |
| 5 | **Billing menu**: Create from Planning, Direct Bill, All Bills only. | Simple, predictable structure. |

---

## Implementation order (suggested)

1. **Merge the two “Create from Planning” flows**  
   - Keep Billing → Create from Planning as the only entry.  
   - Extend it so that after “Create draft” it stays on the same page and runs Audit → Final Check → Approve → Payment/PDF (reuse AuditCheck, FinalCheck, and the workflow strip in one layout).  
   - Remove or redirect Invoice → Create from Planning to Billing → Create from Planning.

2. **Simplify All Bills**  
   - Reduce columns to the set above.  
   - “Open” goes to the same bill-detail view (workflow strip + Record Payment + Download).  
   - Keep Record Payment and Download in row actions where useful.

3. **One “bill detail” view**  
   - Used after “Create draft” in the Billing flow and when opening a bill from All Bills.  
   - Same workflow strip, same placement of Record Payment and Download PDF.

4. **Menu and copy**  
   - Billing: Create from Planning, Direct Bill, All Bills.  
   - Help text or tooltips: “Stage” = workflow step; “Record payment” = enter payment; “Download PDF” = get bill and can mark paid.

Once this is in place, “all 5 steps in the same window” is achieved in **Create from Planning**, and “All Bills” is a clear list with one set of actions (open, record payment, download, delete) so the billing module feels ready and consistent.
