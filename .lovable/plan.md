

# Cancellation Policy with Configurable Time Limits and Partial Refunds

## Overview
This plan implements a comprehensive cancellation policy system that allows the admin to configure:
- Time-based refund rules (e.g., full refund if cancelled 48+ hours before, 50% refund if 24-48 hours, no refund within 24 hours)
- Automatic refund processing via Stripe when appointments are cancelled
- Clear policy display to clients during booking and cancellation

---

## Implementation Summary

### What We'll Build
1. **Database**: New `cancellation_policies` table to store configurable refund rules
2. **Admin UI**: New settings section for admins to configure cancellation tiers
3. **Backend Function**: New `process-refund` edge function to handle Stripe refunds
4. **Client UI**: Updated cancellation flow showing refund amount before confirming
5. **Notifications**: Email/SMS confirmation of refunds

---

## Phase 1: Database Setup

### New Table: `cancellation_policies`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| hours_before | integer | Minimum hours before appointment (e.g., 48) |
| refund_percentage | integer | Refund percentage (0-100) |
| display_order | integer | For ordering tiers |
| is_active | boolean | Enable/disable rule |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

**Example Data:**
- 48+ hours before: 100% refund
- 24-48 hours before: 50% refund  
- Less than 24 hours: 0% refund

**RLS Policies:**
- Admins can CRUD all policies
- Everyone can view active policies (for display during booking)

---

## Phase 2: New Edge Function - `process-refund`

### Functionality:
1. Receive `appointmentId` from frontend
2. Fetch appointment details (date, time, payment_intent_id, service price)
3. Calculate hours until appointment
4. Query cancellation policies to determine refund percentage
5. If refund > 0%, call Stripe API to create refund
6. Update appointment with `refund_status` and `refund_amount`
7. Trigger notification emails/SMS

### Key Logic:
```text
Calculate: hoursUntilAppointment = (appointmentDateTime - now) / 3600000

Query: SELECT refund_percentage FROM cancellation_policies 
       WHERE hours_before <= hoursUntilAppointment 
       AND is_active = true
       ORDER BY hours_before DESC 
       LIMIT 1

If payment_intent_id exists AND refund_percentage > 0:
    refundAmount = (servicePrice * refundPercentage) / 100
    stripe.refunds.create({ payment_intent, amount: refundAmount })
```

---

## Phase 3: Database Schema Updates

### Modify `appointments` Table
Add new columns:
- `refund_status`: text (null, 'pending', 'processed', 'failed')
- `refund_amount`: numeric (amount refunded in dollars)
- `refunded_at`: timestamp

---

## Phase 4: Admin UI - Cancellation Policy Settings

### New Component: `CancellationPolicySettings.tsx`

Location: Add as new tab in Admin page under "Settings"

**Features:**
- List all cancellation policy tiers
- Add/Edit/Delete policy tiers
- Drag-and-drop reordering (optional)
- Preview of policy as it will appear to clients

**UI Layout:**
```text
+--------------------------------------------------+
| Cancellation Policy Settings                      |
+--------------------------------------------------+
| Configure refund rules based on cancellation time |
|                                                   |
| +----------------------------------------------+ |
| | 48+ hours before | 100% refund    | [Edit] [X]| |
| | 24-48 hours      | 50% refund     | [Edit] [X]| |
| | < 24 hours       | No refund      | [Edit] [X]| |
| +----------------------------------------------+ |
|                                                   |
| [+ Add New Tier]                                  |
+--------------------------------------------------+
```

---

## Phase 5: Client-Side Cancellation Flow Updates

### Updated `AppointmentHistory.tsx`

**Before Cancellation:**
1. Fetch applicable cancellation policy based on appointment time
2. Calculate refund amount
3. Display clear modal with:
   - Appointment details
   - Time until appointment
   - Refund amount (or "No refund" message)
   - Confirmation button

**Modal Content Example:**
```text
+----------------------------------------+
| Cancel Appointment                      |
+----------------------------------------+
| Service: Glamour Makeup                 |
| Date: February 10, 2026 at 2:00 PM      |
|                                         |
| Cancellation Policy:                    |
| Your appointment is in 36 hours.        |
| You will receive a 50% refund ($25.00)  |
|                                         |
| [Keep Appointment]  [Confirm Cancel]    |
+----------------------------------------+
```

---

## Phase 6: Booking Page Policy Display

### Updated Booking Flow

Display cancellation policy during booking confirmation:
```text
Cancellation Policy:
- Full refund if cancelled 48+ hours before appointment
- 50% refund if cancelled 24-48 hours before
- No refund within 24 hours of appointment
```

---

## Phase 7: Notifications

### Update `notify-appointment-status` Edge Function

When status changes to "cancelled" and a refund was processed:
- Include refund amount in email/SMS
- Send separate refund confirmation if needed

---

## Technical Details

### Files to Create:
1. `supabase/functions/process-refund/index.ts` - Stripe refund processing
2. `src/components/admin/CancellationPolicySettings.tsx` - Admin UI

### Files to Modify:
1. `src/components/profile/AppointmentHistory.tsx` - Add refund calculation and display
2. `src/pages/Admin.tsx` - Add new tab for cancellation settings
3. `supabase/functions/notify-appointment-status/index.ts` - Include refund info
4. `src/components/ServiceBookingDialog.tsx` - Display policy during booking

### Database Migration:
1. Create `cancellation_policies` table with seed data
2. Add refund columns to `appointments` table

### Dependencies:
- Stripe SDK (already available)
- Existing notification infrastructure (Resend, Twilio)

---

## Data Flow Diagram

```text
Client Cancels Appointment
         |
         v
+------------------+
| Calculate hours  |
| until appt       |
+------------------+
         |
         v
+------------------+
| Query refund %   |
| from policies    |
+------------------+
         |
         v
+------------------+     +------------------+
| Show refund info | --> | User confirms    |
| in modal         |     | cancellation     |
+------------------+     +------------------+
                                  |
                                  v
                         +------------------+
                         | Call process-    |
                         | refund function  |
                         +------------------+
                                  |
                         +--------+--------+
                         |                 |
                         v                 v
                   +-----------+    +-----------+
                   | Stripe    |    | Update DB |
                   | Refund    |    | status    |
                   +-----------+    +-----------+
                         |                 |
                         v                 v
                   +---------------------------+
                   | Send email/SMS with       |
                   | refund confirmation       |
                   +---------------------------+
```

---

## Default Cancellation Policy

The system will be seeded with these default tiers:

| Hours Before | Refund % | Description |
|--------------|----------|-------------|
| 48 | 100% | Full refund |
| 24 | 50% | Partial refund |
| 0 | 0% | No refund |

Admins can modify these values at any time through the settings panel.

