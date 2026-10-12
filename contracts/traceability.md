# BookMe Requirements Traceability Matrix

This document maps every Functional Requirement (`FR-*`) defined in [docs/SRS.md](file:///d:/Personal_details_alkaJha_26-05-2026/mca_3RD_Semester/web%20service%20materials/BookMe_team_project/BookMe/docs/SRS.md) to its corresponding OpenAPI operation(s), AsyncAPI event(s), or internal/UI implementation designation.

---

## 1. Onboarding and Verification (ONB)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-ONB-01** | Customer OTP registration, login credentials, 5-attempt lockout | `sendOtp`, `verifyOtp`, `registerUser`, `loginUser`, `refreshToken`, `logoutUser`, `getCurrentUser`, `updateCurrentUser` | None | API |
| **FR-ONB-02** | Vendor registration with photo, categories, location pin & radius | `createVendorProfile` | None | API |
| **FR-ONB-03** | DigiLocker KYC, PAN verification, bank penny-drop for payouts | `startDigiLockerKyc`, `handleDigiLockerCallback`, `getKycStatus`, `submitPanVerification`, `submitBankVerification` | None | API (Only masked references stored) |
| **FR-ONB-04** | Vendor agreement e-sign with IP, timestamp, and version | `signVendorAgreement`, `acceptTerms`, `getAgreementStatus` | None | API |
| **FR-ONB-05** | Customer damage liability terms acceptance before first booking | `acceptTerms`, `getAgreementStatus` | None | API |
| **FR-ONB-06** | Verifier approve/reject vendor with mandatory reason | `getVendorVerificationStatus`, `decideVendorVerification` | `vendor.kyc.status_changed` | API & Event |

---

## 2. Vendor Listing and Availability (VEN)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-VEN-01** | Vendor profile with description, location, media, ratings, packages | `getVendorById`, `getMyVendorProfile`, `updateVendorProfile`, `listCategories`, `getCategory`, `listVendorPackages` | None | API |
| **FR-VEN-02** | Media rules (5MB img, 20MB video), pre-signed URL, duplicate hash check, moderation | `generateMediaUploadUrl`, `getMediaStatus`, `moderateMedia` | `media.uploaded`, `media.moderated` | API & Event |
| **FR-VEN-03** | Packages with tiers (Basic, Standard, Premium), base price, unit, inclusions | `createPackage`, `listVendorPackages`, `getPackageById`, `updatePackage`, `deletePackage` | None | API |
| **FR-VEN-04** | Package Add-ons with prices and pricing basis | `createPackageAddon`, `updatePackageAddon`, `deletePackageAddon` | None | API |
| **FR-VEN-05** | Discounts: flat/percent, package/vendor scoped, dates, min order, code | `createDiscount`, `listDiscounts`, `deleteDiscount` | None | API |
| **FR-VEN-06** | Availability calendar with capacity per package per date/slot, atomic decrement | `getPackageAvailability`, `setPackageAvailability`, `bulkSetAvailability`, `checkPublicAvailability`, `internalHoldCapacity`, `internalReleaseCapacity`, `internalBookCapacity` | None | API |
| **FR-VEN-07** | Zero capacity package omitted from availability | `checkPublicAvailability` | None | API (Enforced by search query filter) |
| **FR-VEN-08** | Search shows matching services; profile shows all vendor services | `getSearchVendorProfile`, `getMatchingPackages` | None | API |
| **FR-VEN-09** | Refundable security deposit per package for damage-prone items | `createPackage`, `getPackageById` | None | API (`securityDepositPaise` field) |
| **FR-VEN-10** | Booking stores immutable price, tax, and terms snapshot at confirmation | `getBookingById` | None | API (`priceSnapshot` payload) |
| **FR-VEN-11** | Taxes: GST rate and HSN/SAC code per package | `createPackage`, `calculatePaymentQuote` | None | API |

---

## 3. Search (SRCH)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-SRCH-01** | Search by vendor name (partial, case-insensitive) | `searchVendors` | None | API (`query` parameter) |
| **FR-SRCH-02** | Filter by date or date range | `searchVendors` | None | API (`startDate`, `endDate`) |
| **FR-SRCH-03** | Filters: category, rating, brand, price, discount, PostGIS radius | `searchVendors` | None | API |
| **FR-SRCH-04** | Results show matching packages only; sort by relevance, rating, price, distance | `searchVendors`, `getMatchingPackages` | None | API |
| **FR-SRCH-05** | Empty results offer Notify Me action | `createNotifyRequest` | None | API |
| **FR-SRCH-06** | Search returns in < 2 seconds p95 at 10,000 vendors | None | None | Non-functional performance requirement (PostGIS indexes) |

---

## 4. Event Planner (PLAN)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-PLAN-01** | Create event: date range, venue, guest count, checklist items | `createPlannerEvent`, `listPlannerEvents`, `getPlannerEvent`, `updatePlannerEvent`, `cancelPlannerEvent`, `addChecklistItem`, `listChecklistItems`, `updateChecklistItem`, `deleteChecklistItem` | None | API |
| **FR-PLAN-02** | Matching available packages and vendors per checklist item | `listMatchingVendorsForItem` | None | API |
| **FR-PLAN-03** | Coverage summary with covered and not-covered items | `getEventCoverageSummary` | None | API |
| **FR-PLAN-04** | Checklist items become individual bookings grouped under event | `createBookingRequest` | None | API (`eventItemId` parameter) |

---

## 5. Booking (BKG)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-BKG-01** | Submit booking request; state REQUESTED; capacity soft-held | `createBookingRequest`, `getBookingById`, `listBookings` | `booking.requested` | API & Event |
| **FR-BKG-02** | Vendor accepts, rejects, or counters; EXPIRED on response timeout | `acceptBooking`, `rejectBooking` | `booking.accepted`, `booking.rejected`, `booking.expired` | API & Event |
| **FR-BKG-03** | Negotiation via structured counter-offers (max 3, 6-hr expiry) | `submitCounterOffer`, `acceptCounterOffer`, `getBookingTimeline` | `booking.countered` | API & Event |
| **FR-BKG-04** | Customer pays 40% deposit within 2 hours; CONFIRMED state | `createDepositOrder`, `internalConfirmDeposit` | `booking.confirmed`, `payment.deposit.succeeded` | API & Event |
| **FR-BKG-05** | Delivery or self-pickup choice before balance due date | `selectDeliveryChoice` | None | API |
| **FR-BKG-06** | Rush requests within threshold add surcharge percentage | `calculateRushQuote`, `createBookingRequest` | None | API |
| **FR-BKG-07** | Vendor GPS check-in (Arrived); 30m alert; 2h NO_SHOW transition | `vendorCheckIn` | `booking.in_progress`, `booking.no_show` | API & Event |
| **FR-BKG-08** | Customer confirms completion or auto-complete 24h post event end | `confirmBookingCompletion` | `booking.completed` | API & Event |
| **FR-BKG-09** | Stock limited rejection or free cancellation rule | `rejectBooking`, `cancelBooking` | `booking.rejected`, `booking.cancelled` | API & Event |

---

## 6. Payments (PAY)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-PAY-01** | Licensed gateway with marketplace/escrow | `handleGatewayWebhook`, `getPaymentById`, `listPaymentsForBooking` | None | API (BookMe holds no customer funds) |
| **FR-PAY-02** | Deposit 40% and Balance 60% orders with balance reminders | `createDepositOrder`, `createBalanceOrder`, `calculatePaymentQuote` | `payment.deposit.succeeded`, `payment.balance.succeeded`, `payment.balance.overdue` | API & Event |
| **FR-PAY-03** | Escrow payout release 24h after completion if no dispute open | `getPayoutStatus`, `listVendorPayouts` | `payment.payout.scheduled`, `payment.payout.released` | API & Event |
| **FR-PAY-04** | Refunds to original payment source with ledger entry & reason | `processRefund` | `payment.refund.processed` | API & Event |
| **FR-PAY-05** | Gateway fee line item; platform GST invoice for lead fees | `calculatePaymentQuote`, `getInvoicesAndReceipts` | None | API |
| **FR-PAY-06** | Damage claims filed within 48h with evidence; resolution | `fileDamageClaim`, `getDamageClaim`, `respondDamageClaim`, `decideDamageClaim`, `raiseBookingDispute` | `payment.damage_claim.decided`, `booking.disputed` | API & Event |

---

## 7. Cancellation (CAN)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-CAN-01** | Customer cancellation charge table (§2.4) with refund quote | `previewCancellationCharges`, `cancelBooking` | `booking.cancelled` | API & Event |
| **FR-CAN-02** | Vendor cancellation penalty table (§2.4) deducted from wallet | `cancelBooking` | `booking.cancelled`, `penalty.applied` | API & Event |
| **FR-CAN-03** | Force majeure claim with evidence; charge waiver audit-logged | `cancelBooking` | `booking.cancelled` | API & Event |
| **FR-CAN-04** | NO_SHOW applies 100% vendor penalty & 100% customer refund | None | `booking.no_show`, `penalty.applied`, `payment.refund.processed` | Automated Event Transition |

---

## 8. Communication and Lead Billing (COM)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-COM-01** | In-app chat & VoIP only; contact details masked in all APIs | `createOrGetThread`, `listThreads`, `listMessages`, `sendMessage`, `issueCallToken` | None | API (PII strictly masked) |
| **FR-COM-02** | Chat regex filters block phone, email, UPI, links; strike warning | `sendMessage` | None | API |
| **FR-COM-03** | Rate limiting per user on chat and VoIP | None | None | Gateway / Middleware enforcement (§11.6) |
| **FR-COM-04** | Qualified lead: connected >= 30s, customer-initiated, OTP-verified | `handleCallWebhook`, `getLeadQualification` | `call.ended`, `lead.qualified` | API & Event |
| **FR-COM-05** | Anti-spam: 10 daily billable cap, short-call heuristics | `getLeadQualification` | None | Internal worker logic |
| **FR-COM-06** | Vendor disputes lead within 48h; automatic refund if upheld | `disputeLead`, `resolveLeadDispute` | None | API |
| **FR-COM-07** | Evidence attachments up to 100MB kept 12 months/90 days | `generateEvidenceUploadUrl`, `getEvidenceMetadata` | None | API |
| **FR-COM-08** | Call recording consent; kept 90 days | `handleCallWebhook` | None | WebRTC client & webhook handling |

---

## 9. Wallet (WAL)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-WAL-01** | Prepaid wallet topped up via gateway; append-only ledger | `getWalletBalance`, `getWalletLedger`, `createTopupOrder` | None | API |
| **FR-WAL-02** | Qualified lead creates debit entry linked to call ID | `listBilledLeads` | `lead.qualified` | API & Event |
| **FR-WAL-03** | Alerts at 150% and 100% of minimum with days-left estimate | `getWalletAlertSettings`, `updateWalletAlertSettings` | `wallet.low_balance` | API & Event |
| **FR-WAL-04** | Below minimum 48h grace period then hidden from search | `getWalletBalance` | `vendor.wallet.status_changed` | API & Event |
| **FR-WAL-05** | Prepaid credit used only for leads/penalties; closure refund | None | None | Policy constraint in docs/DECISIONS.md |

---

## 10. Reviews (REV)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-REV-01** | Review allowed only for COMPLETED booking, 14-day window, rating 1-5, photos | `createReview`, `listVendorReviews` | `review.submitted` | API & Event |
| **FR-REV-02** | Review form blocked before booking is COMPLETED; API rejects early | `createReview` | None | API (Validation rule) |
| **FR-REV-03** | Vendors cannot edit/delete reviews; single public reply | `replyToReview` | None | API |
| **FR-REV-04** | Report review; Content Moderator removal with mandatory reason | `reportReview`, `moderateReview` | `review.removed` | API & Event |

---

## 11. Support (SUP)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-SUP-01** | Bot answers FAQs, status, charges; never modifies money | `sendBotMessage` | None | API |
| **FR-SUP-02** | Escalation to ticket after 2 failed bot attempts or dispute keywords | `sendBotMessage`, `createSupportTicket` | `ticket.created` | API & Event |
| **FR-SUP-03** | SLAs: 4h normal, 30m urgent (<24h), 48h resolution | `listAdminTickets`, `assignTicket`, `getSlaStatusReport` | `ticket.created` | API & Event |
| **FR-SUP-04** | Callback request; no admin phone number displayed | `requestCallback` | None | API |
| **FR-SUP-05** | Tickets linked to bookings with full history; customer & vendor | `createSupportTicket`, `listUserTickets`, `getSupportTicket`, `updateSupportTicket` | None | API |

---

## 12. Admin (ADM)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-ADM-01** | Sub-roles: Super Admin, Verifier, Support Agent, Finance Admin, Content Moderator | `listAdminUsers`, `updateUserRoles` | None | API (Declared in `x-roles`) |
| **FR-ADM-02** | Immutable audit log for all admin actions | `queryAuditLogs` | None | API |
| **FR-ADM-03** | Config editor for all CONFIG values with change history | `listConfigs`, `updateConfig`, `getConfigHistory` | None | API |
| **FR-ADM-04** | Vendor enforcement ladder: warning, suspension, termination | `applyVendorEnforcement` | None | API |

---

## 13. Notifications (NOT)

| Requirement ID | Description | OpenAPI Operation(s) | AsyncAPI Event(s) | Designation / Notes |
|---|---|---|---|---|
| **FR-NOT-01** | Channels: push, SMS, email; preferences; critical alerts locked | `registerDeviceToken`, `unregisterDeviceToken`, `getNotificationPreferences`, `updateNotificationPreferences`, `listInboxNotifications`, `markNotificationAsRead` | `notification.requested` | API & Event |
| **FR-NOT-02** | Notify me: capacity opens alert; max 3/day; expires after event | `createNotifyRequest`, `listNotifyRequests`, `cancelNotifyRequest` | `capacity.opened`, `notification.requested` | API & Event |
| **FR-NOT-03** | Full list of lifecycle events notified | `listInboxNotifications` | `notification.requested` | API & Event |
