Project PDP (Detailed)

Summary

This project develops a modern, mobile-friendly web application with a clean, professional UI/UX, featuring three portals: Reseller (Admin + Team) for placing and tracking orders, Staff for fulfilment workflows, and Owner/Admin for operations, financials, and reporting. The system supports multiple order categories, screenshot uploads, real-time order queues, chat, and robust financial tracking and reporting.


User Flow Script

1. Reseller Admin
Login → Dashboard (all team orders, live queue, staff status) → Submit Orders (category, cart value, SLA, screenshots, customer info, optional fields) → Manage Orders (track statuses, SLA timers, fulfilment proofs) → Chats (reply all team chats, set visibility rules) → Balance & Reports (USD/INR balance, daily logs, CSV/PDF export) → Team Management (invite/remove, assign roles, configure chat visibility).

2. Reseller Team
Login → Dashboard (personal orders view, SLA countdowns) → Submit Orders (form with category, value, SLA, screenshots) → Orders List (see statuses, order details) → Chats (reply only in own orders, read-only others if allowed) → Balance & Daily Summary (view completed/pending orders, totals payable in USD/INR).

3. Staff
Login → Dashboard (status toggle Online/Paused/Offline, optional capacity setting) → Queue (see pending orders, actions: Pick, Pass with reason, Hold with reason, active “Now Working” panel) → On Pick (auto-open chat with Reseller Staff/Admin, exchange clarifications, attach proofs, hold/resume control) → Fulfilment (enter merchant link, name on order, final value, upload proof, submit → moves to Fulfil_Submitted) → Daily CC Summary (log CCs used/worked, notes; visible to Owner).

4. Owner/Admin
Login → Live Ops Dashboard (staff list with statuses, break timers, queue depth, SLA breaches, ETAs) → Orders Management (view all orders) → Financials (P&L USD/INR, receivables, mark payments, reset balances) → Rates & Presets → Disputes Center → Reporting & Audits.


Deliverables

System Overview (Three Portals)
- Owner Portal – operations, P&L (USD/INR), receivables, presets, users/roles, disputes.
- Reseller Portal (Admin + Team) – submit orders, track statuses/ETAs, balances/logs, chats.
- Staff Portal – availability, manual Pick/Pass, live chats, Hold, fulfilment upload, daily CC summary.

Shared Concepts

Order Status Machine
Submitted → In_Queue → Picked → In_Progress ↔️ On_Hold → Fulfil_Submitted → Completed / Disputed → Resolved(Completed) / Cancelled / Auto_Cancelled / Failed
- Auto-cancel SLA: If In_Queue > 10 minutes → Auto_Cancelled.
- Manual Pick/Pass only (Pass requires reason).
- Hold: pauses timers; chat stays open; can resume.

Categories
Chipotle, Food, Movies, Flights, Others

Currency
- All order values in USD.
- P&L and Balance shown in USD and INR (fixed at ₹89/$).

Chats & Retention
- Auto-open order chat on Pick; auto-close on Completed/Disputed/Cancelled.
- Chat logs auto-delete after 20 days.
- Order records and financials retained indefinitely.

Reseller Portal (Admin + Team)

Submit Order
Required
- Category (Chipotle/Food/Movies/Flights/Others)
- Cart Value (USD)
- Merchant Domain (or typed name)
- Customer Name (as on order)
- Country / City
- Contact (phone/email if needed)
- Urgency/SLA: ASAP | Today | 24h
- Attachments: cart screenshots (multi)
Optional
- Pickup/Delivery Address
- Time Window
- Items summary / Notes
- Currency override (default USD)

Auto UI
- If value < $44, show banner: billed at floor $44 (Chipotle = 30% of max(value,$44), Others = 25% of max(value,$44); unless overridden by preset).
- Show available staff list with status and ETA to start.

Live Queue & Status
- Real-time orders with SLA countdowns and staff badges (Online/Paused/Offline).
- ETA to start based on moving average handle time × queue depth.

Chats
- ResellerAdmin: reply in all team chats; set visibility rules.
- ResellerStaff: reply only on own order chats; read others if allowed.
- Chat closes on completion/cancel; transcript available 20 days.

Balance & Logs
- Balance Due (USD & INR) – live total owed to Owner.
- Daily Summary: per day → orders completed, total cart value, total payable.
- Drill-down to order list with fulfilment proof and details.
- Export CSV/PDF.

Roles & Team Controls (Admin)
- Invite/remove team members; set submission/view permissions.
- Configure team chat visibility.

Nice-to-Have
- Bulk order upload (CSV + images).
- Templates per merchant.
- Notifications for key events.

Staff Portal

Status & Capacity
- Online | Paused/Break | Offline; Owner sees break duration.
- Optional capacity: “I can take N orders now”.

My Queue
- Pending In_Queue orders with category, value, merchant, SLA timer.
- Actions: Pick, Pass (reason required), Hold (reason required).

Order Work & Chat
- On Pick: auto-open chat with Reseller Staff/Admin.
- Hold keeps chat open; not counted in active timers; resume allowed.

Fulfilment
- Required: Merchant Link, Name on Order, Final Value (USD), Proof (screenshot/receipt).
- Submit → Fulfil_Submitted; Reseller marks Complete or Dispute.

Daily CC Summary
- End-of-day: Total CCs Used, Total CCs Worked, Notes (optional).
- Owner views per-staff summaries and aggregates.

Nice-to-Have
- Auto reminder to submit CC summary when going Offline.
- Personal productivity dashboard.

Owner Portal

Live Ops Dashboard
- Staff list with statuses, break timers, active orders.
- Queue depth by category, SLA breaches, auto-cancels.
- ETAs by staff (moving average handle time per category).

P&L (USD & INR)
- Revenue per order = % × max(cart_value, $44 floor) (30% Chipotle, 25% Others; overridable by preset).
- Costs: Staff payout ₹100 per completed order; Proxy $8/day; Software $30/month; Misc manual entries.
- Views: by day/week, by reseller, by staff, by category; Net Profit in USD/INR.

Receivables & Payments
- Reseller Balances with totals (USD & INR).
- Per-reseller statement; Mark as Paid (Owner) → payment record; resets running balance.
- Payment history: amount, date, method, notes.

Rate Presets & Rules
- Named presets: {category → percent, min_floor}; apply to reseller (versioned, auditable) with overrides.

Disputes Center
- See Disputed orders with reasons/evidence; actions: Fix & Complete, Decline & Complete, Partial Refund/Credit (adjust balances).

Reporting & Audits
- Staff metrics: AHT, success %, pass/hold ratio, break time, orders/day.
- Reseller metrics: dispute %, low-value submissions, auto-cancel rate.
- Activity log: who passed/held, who marked paid, etc.; CSV/PDF exports.


