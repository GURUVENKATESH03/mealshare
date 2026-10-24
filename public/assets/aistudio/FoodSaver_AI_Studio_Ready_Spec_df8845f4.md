# FoodSaver — AI Studio–Ready Product & Build Specification

**Product:** FoodSaver (working UI name: Meal Share)  
**Document version:** 2.0  
**Purpose:** A clear, step-by-step specification for building and refining FoodSaver with Google AI Studio  
**Document status:** Target specification; existing implementation details are retained as source context, not assumed to be correct in the target build.

---

## 1. How to Use This Document

This document is designed to be used as the single working specification while building FoodSaver in small, verifiable increments.

1. Read Sections 2–5 to understand the product, the recommended architecture, and the MVP boundary.
2. Build one phase at a time. Do not ask AI Studio to generate the whole application in one prompt.
3. Before each phase, provide AI Studio with this document and the specific task for that phase.
4. Ask AI Studio to inspect the existing project before changing files. If starting a new project, state that explicitly.
5. After each task, run the app, test the acceptance criteria, and fix failures before moving on.
6. Keep secrets in environment variables or the hosting platform's secret manager. Never paste production credentials into prompts or commit them to source control.
7. Treat this document as the target behavior. If the existing app differs, report the difference and make the smallest safe change that satisfies the target.

### Requirement labels

- **MVP:** Required for the first usable release.
- **Hardening:** Required before public launch.
- **Later:** Intentionally deferred.
- **Existing source note:** Describes the supplied FoodSaver specification's account of the current repository; it is not independent verification of the repository contents.

---

## 2. Product Overview

FoodSaver is a free, peer-to-peer surplus-food coordination platform. It helps a donor offer edible surplus food to nearby receivers and coordinates a safe, verifiable handover.

### Core promise

**Post surplus food → a nearby receiver claims it → the donor approves one claim → the receiver collects it → the donor verifies the handover.**

FoodSaver is not a paid delivery marketplace. It does not include payments, carts, checkout, courier dispatch, or paid delivery.

### Problem being solved

- Edible surplus food is often discovered too late.
- Informal coordination can lead to duplicate claims and no-shows.
- Receivers need to find food within a practical distance.
- Donors need a reliable way to confirm collection.
- Communities need credible records of food rescued.

### Product goals

1. Make posting a donation quick and understandable.
2. Help receivers find relevant, available food nearby.
3. Ensure one donation cannot be approved for multiple receivers.
4. Give both parties clear status updates and communication.
5. Verify handover without exposing the verification code to the donor through an API.
6. Give administrators basic oversight of accounts and platform activity.

### Non-goals for the MVP

- Payments, tips, paid delivery, or courier assignment.
- Native iOS/Android apps; build a responsive web application.
- Multi-region enterprise tenancy.
- Formal food-safety certification or legal attestation workflows.
- AI-based matching, reputation scoring, demand forecasting, or route batching.
- Complex organisation hierarchies.

---

## 3. Users and Permissions

### 3.1 Roles

| Role | Purpose | Main capabilities |
|---|---|---|
| `DONOR` | Person or organisation offering food | Create and manage own listings, review claims, approve/reject claims, communicate with receivers, view pickup progress, verify handover |
| `RECEIVER` | Person or organisation collecting food | Browse listings, search nearby, submit/cancel claims, communicate with donor, start pickup, share location, show handover code |
| `ADMIN` | Platform operator | View platform dashboard, search users, change permitted roles, suspend/reactivate accounts, investigate reports when moderation is added |
| Unauthenticated visitor | Public discovery | View landing page and available listings; must sign in to claim food or use protected features |

**Target decision:** Do not use a general `USER` role as the final role for a fully registered account. Signup must explicitly choose `DONOR` or `RECEIVER`. `ADMIN` must never be assignable by public signup.

### 3.2 Authorisation rules

- Enforce access rules on the server/database, not only by hiding UI controls.
- A donor can change only their own donations.
- Only the owner donor can approve or reject claims for a donation.
- A receiver can manage only their own claims and pickup location.
- Only the donor associated with the approved claim can verify its handover.
- Only participants in a donation conversation can read or send its messages.
- Only participants can access pickup details or subscribe to live location.
- Only administrators can access admin endpoints and admin data.
- A suspended account cannot sign in or perform protected actions.
- Public listing endpoints must not reveal private phone numbers, verification codes, or live pickup coordinates.

---

## 4. Recommended Architecture for AI-Assisted Development

### 4.1 Recommendation

For a simpler, AI-friendly web application, use one coherent stack:

| Layer | Recommended target |
|---|---|
| Web app | React + TypeScript + Vite |
| Styling | Tailwind CSS with a small, documented design-token set |
| Routing | React Router |
| Server state / API calls | TanStack Query or a small typed service layer; avoid adding both unnecessary state libraries and duplicate caches |
| Backend platform | Supabase |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Spatial search | PostgreSQL with PostGIS where available; otherwise use a tested Haversine query for the initial city-scale MVP |
| File storage | Supabase Storage |
| Trusted business operations | Supabase Edge Functions and PostgreSQL transactions/RPCs |
| Map | Leaflet with OpenStreetMap-compatible tiles |
| Road directions | OSRM adapter; isolate the provider behind one service so it can be replaced |
| Hosting | A static frontend host plus Supabase; choose the host after local build and environment setup work |
| Tests | Vitest + React Testing Library; add database/API integration tests for security-sensitive flows |

**Why this recommendation:** FoodSaver has relational entities and important atomic operations: approving one claim must reserve a donation and reject competing claims as one logical operation. PostgreSQL fits these relationships and transaction requirements well. Supabase groups authentication, database, storage, and server functions into one platform, reducing the number of separate services to configure.

### 4.2 What changes from the supplied implementation

The supplied FoodSaver spec describes an existing Vue 3 + Vite frontend and a Java 21 + Spring Boot backend with PostgreSQL on Supabase. It also lists an existing API surface and numerous implemented flows.

The recommended target above changes the frontend from Vue to React and replaces the Spring Boot API with Supabase-managed services and trusted Edge Functions/database operations. This is a **migration**, not a small refactor. Do not start by rewriting every feature at once.

### 4.3 Migration choices and trade-offs

| Option | Advantages | Costs / risks | Recommendation |
|---|---|---|---|
| A. Keep Vue + Spring Boot + PostgreSQL | Least disruption; existing services and API contracts remain useful | AI Studio-generated changes may need to fit the existing Java/Vue architecture; more backend deployment/configuration remains | Best if preserving the current repository is the priority |
| B. React + Supabase | Coherent AI-friendly web stack; relational data; managed auth/storage; transactions can protect claim arbitration | Requires rebuilding the UI and moving business rules out of Spring Boot; migration and parity testing are essential | **Recommended for a deliberate clean rebuild** |
| C. React + Firebase | Strong Google ecosystem integration and fast prototyping | FoodSaver's relational data, filtering, atomic claim arbitration, and radius search need careful modelling; backend rules still required | Consider only if Firebase familiarity/integration is more important than relational simplicity |

### 4.4 Migration rule

Do not run two writable implementations of the same workflow indefinitely.

Use one of these explicit paths:

- **Clean rebuild:** create a new target app, recreate the schema and rules, migrate data only if needed, test parity, then switch over.
- **Incremental migration:** keep the existing app live while building the target separately. Do not split one transaction-sensitive workflow between the old and new backends. Cut over complete workflows, not individual steps of a claim transaction.

Before migration, inspect the actual repository and confirm whether data must be preserved. The supplied spec does not state whether production users or donation records must be migrated.

### 4.5 Non-negotiable architecture rules

- Never put service-role keys, database passwords, JWT signing secrets, or other private credentials in browser code.
- Do not trust client-supplied roles, donor IDs, claim ownership, donation status, or verification outcomes.
- Use Row Level Security (RLS) on exposed Supabase tables and test policies with multiple roles.
- Put atomic state transitions in a database transaction or trusted server function.
- Do not expose a pickup verification code in donor-facing API responses.
- Live location must be available only to the relevant participants and only during an active pickup.
- External map/routing providers must be wrapped in service functions, not called from many UI components directly.

---

## 5. MVP Scope

Build the MVP in this order. Do not start ratings, AI matching, advanced analytics, or multi-stop routing before the main handover flow works end to end.

### MVP modules

1. Authentication and role selection.
2. User profile and account status.
3. Donation creation, editing, cancellation, and expiry.
4. Public discovery feed with search, category filters, pagination, and detail page.
5. Nearby search and map.
6. Claim submission, approval, rejection, cancellation, and competing-claim arbitration.
7. Pickup start, receiver location sharing, and handover-code verification.
8. Donation-scoped chat.
9. In-app notifications.
10. Basic donor/receiver dashboards and admin user management.
11. Security rules and automated tests for ownership/state transitions.

### Defer until the MVP is reliable

- Ratings and reviews.
- Reports and moderation queue.
- Real impact calculations and impact reporting.
- Password reset if not provided by the chosen authentication platform's standard flow.
- Advanced push, SMS, and email notifications.
- Multi-donation pickup batching and predictive ETA.
- Demand forecasting and NGO bulk workflows.
- Multi-instance live-location fan-out and advanced analytics.

---

## 6. Main User Journeys

### 6.1 Donor journey

1. Register and select `DONOR`.
2. Complete the minimum profile details.
3. Create a donation with title, description, category, quantity, pickup address, location, cooked time (if known), and expiry time.
4. Review the listing before publishing.
5. The listing appears as `AVAILABLE` in the feed and map.
6. Receive a notification when a receiver submits a claim.
7. Review the claim and approve or reject it.
8. When approving one claim, the system reserves the donation and rejects all other pending claims atomically.
9. View the approved receiver's pickup progress while the pickup is active.
10. At handover, ask the receiver to show their six-digit code and enter it to verify collection.
11. The system marks the request `COMPLETED` and donation `PICKED_UP`.

### 6.2 Receiver journey

1. Register and select `RECEIVER`.
2. Browse available donations or search by category, text, and distance.
3. Open a donation detail page and review pickup location, quantity, and expiry.
4. Submit one claim with an optional message.
5. Wait for approval or rejection and receive a notification.
6. If approved, provide pickup person's name, phone, and planned pickup time.
7. Start pickup and receive the six-digit handover code.
8. Share current location while travelling, only after explicit browser permission.
9. At the pickup point, show the code to the donor.
10. The donor verifies the code; the receiver sees the completed state.

### 6.3 Admin journey

1. Sign in using an account already assigned `ADMIN` by a trusted process.
2. View aggregate counts: users, available donations, pending claims, active pickups, completed donations.
3. Search and filter users by name/email, role, and account status.
4. Change a user's role only within the permitted role policy.
5. Suspend/reactivate an account or delete it according to the defined retention policy.
6. Review audit information for sensitive administrative actions.

### 6.4 Error and recovery journeys

- If a claim loses the approval race, show that the donation is no longer available and refresh its state.
- If location permission is denied, allow the receiver to continue to the pickup address without live tracking; explain that live tracking is unavailable.
- If GPS updates fail temporarily, keep the last successful timestamp visible and retry safely.
- If a wrong code is entered, keep pickup `EN_ROUTE`, show a generic error, and count the failed attempt.
- If the donation expires before approval, reject the attempted approval and explain that the listing expired.
- If a receiver cancels an approved claim before handover, return the donation to `AVAILABLE` only if the business rules and transaction checks permit it.
- If a network request times out, refetch the authoritative state before repeating a non-idempotent action.

---

## 7. Screens and UI Requirements

### 7.1 Public screens

| Screen | Required behavior |
|---|---|
| Landing page `/` | Explain the free food-sharing model, show how it works, display a sample/current listing feed, provide sign-up and browse actions |
| Login `/auth/login` | Email/password sign-in, validation, loading state, clear error messages |
| Signup `/auth/signup` | Name, email, password, explicit `DONOR` or `RECEIVER` choice; never offer `ADMIN` |
| Donation feed `/donations` | Search, category/status filters, pagination, loading/empty/error states |
| Donation detail `/donations/:id` | Full listing details, expiry/pickup details, donor-safe public information, claim CTA for signed-in receivers |
| Map `/map` | Available donation markers, marker detail, distance-aware discovery; do not expose private live receiver location |

### 7.2 Authenticated screens

| Screen | Required behavior |
|---|---|
| Dashboard `/dashboard` | Role-specific summary and relevant next actions |
| Create donation `/donations/create` | Validated form, location selection, expiry validation, image URL or storage upload only after selected implementation is ready |
| My donations | Donor's own listings, status, edit/cancel actions when allowed, incoming claims |
| My requests `/requests` | Receiver's claims, statuses, cancel action when allowed, link to pickup |
| Receiver tracking `/tracking/:requestId` | Start pickup if approved, display code only to receiver, request location permission, show GPS status |
| Donor tracking `/tracking/:requestId/donor` | Show live receiver location only for the approved active pickup, verify code form |
| Chat `/chat` | Conversation list, message history, send message, unread indicator |
| Notifications `/notifications` | Paginated notifications, mark one/all read, navigate to related item |
| Profile `/profile` | Read/update allowed profile fields and change password using the auth provider |
| Admin users `/dashboard/users` | Search/filter/paginate users, role/status controls, confirm destructive actions |
| Admin analytics `/dashboard/analytics` | Display real counts only; label any temporary demo data clearly |

### 7.3 Shared UI behavior

Every data-driven screen must have:

- Loading, success, empty, and error states.
- Form-level and field-level validation.
- Disabled state during in-flight submissions to prevent duplicate actions.
- Confirmation for destructive or irreversible actions.
- Clear status labels using the canonical state names.
- Responsive layout, keyboard accessibility, visible focus states, and touch targets of approximately 44×44 px.
- Accessible labels and meaningful error messages.
- No fake success messages when a server action fails.

### 7.4 Design direction

Preserve the existing FoodSaver design intent unless the user changes it:

- Warm ivory background and deep coffee surfaces.
- Marigold primary and basil-green secondary colors.
- Paprika/red for urgency and expiry.
- Bricolage Grotesque for display text, Karla for body text, and IBM Plex Mono for technical values where appropriate.
- Soft, restrained shadows; warm borders; clear pill-shaped status and expiry labels.
- Skeleton loading states, concise empty states with a next action, and a mobile bottom navigation for the most common receiver tasks.

Use the existing `tokens.css` and `Skill.md` as the design source if the existing project is being retained. For a new React build, migrate these tokens rather than inventing an unrelated visual system.

---

## 8. Core Business Rules and State Machines

These rules are authoritative for the target build. If the existing code disagrees, report the discrepancy before changing data or behavior.

### 8.1 Donation statuses

Canonical statuses:

- `AVAILABLE`
- `RESERVED`
- `PICKED_UP`
- `EXPIRED`
- `CANCELLED`

Allowed transitions:

| From | Action/condition | To | Notes |
|---|---|---|---|
| New | Valid donor creates listing | `AVAILABLE` | Server assigns donor from authenticated identity |
| `AVAILABLE` | Donor approves one eligible claim | `RESERVED` | Approval and competing-claim rejection must be atomic |
| `AVAILABLE` | Expiry time passes | `EXPIRED` | Background task or scheduled function |
| `AVAILABLE` | Donor cancels listing | `CANCELLED` | No active approved claim |
| `RESERVED` | Valid handover code is verified | `PICKED_UP` | Must also complete the associated claim |
| `RESERVED` | Approved claim is cancelled before pickup | `AVAILABLE` | Only if cancellation policy permits and transaction succeeds |

No client may set arbitrary donation statuses. Implement explicit commands that validate the current state and actor.

### 8.2 Claim/request statuses

Canonical statuses:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `COMPLETED`
- `CANCELLED`

| Action | Actor | Preconditions | Atomic side effects |
|---|---|---|---|
| Create claim | Receiver | Donation is `AVAILABLE`; no duplicate pending claim by same receiver | Create `PENDING`; notify donor |
| Approve claim | Owner donor | Claim is `PENDING`; donation is `AVAILABLE` and not expired | Set selected claim `APPROVED`; donation `RESERVED`; reject all other pending claims for that donation; notify affected receivers |
| Reject claim | Owner donor | Claim is `PENDING` | Set `REJECTED`; notify receiver |
| Cancel claim | Receiver | Claim is `PENDING` or `APPROVED`, subject to pickup rules | Set `CANCELLED`; if approved and eligible, release donation back to `AVAILABLE`; notify donor |
| Complete claim | Trusted handover verification only | Claim is `APPROVED`; tracking is `EN_ROUTE`; code valid | Set claim `COMPLETED`, tracking `VERIFIED`, donation `PICKED_UP`; close live stream |

**Important:** Do not allow a generic “complete” endpoint to bypass verification. Completion should occur through the successful handover-verification operation.

### 8.3 Pickup tracking statuses

Canonical statuses:

- `PENDING`
- `EN_ROUTE`
- `VERIFIED`
- `CANCELLED`

| Action | Actor | Preconditions | Result |
|---|---|---|---|
| Start pickup | Receiver | Approved claim; no existing tracking record | Create one tracking record, issue secure six-digit code, set `EN_ROUTE`, notify donor |
| Update location | Receiver | Own approved claim; tracking is `EN_ROUTE`; consent/permission granted | Store latest coordinates/time and publish to authorised donor stream |
| Read tracking | Donor or receiver participant | Participant relationship confirmed | Return only fields appropriate for that role |
| Verify code | Owner donor | Tracking is `EN_ROUTE`; attempt limit not exceeded | Valid code completes claim and donation; invalid code increments failure counter |
| Cancel pickup | Receiver | Tracking is `EN_ROUTE` | Set `CANCELLED`, stop stream, notify donor; donation release policy must be enforced explicitly |

There must be at most one tracking record per claim. A cancelled pickup must not be restarted silently unless a deliberate restart policy is implemented.

### 8.4 Claim arbitration and concurrency

This is one of the most important correctness requirements.

- Two donors/receivers must not be able to reserve the same donation through simultaneous requests.
- Approval must execute inside one database transaction or trusted function.
- The operation must lock or conditionally update the donation so only one approval succeeds.
- Competing pending claims must be rejected in the same transaction.
- Notifications may be created after the state transition, but a notification failure must not undo a valid handover or leave the domain state half-updated.
- Add integration tests that attempt two approvals concurrently.

### 8.5 Expiry

- An `AVAILABLE` donation whose expiry timestamp has passed becomes `EXPIRED`.
- Expired listings must not appear in the available feed or be approved.
- Run expiry processing at a documented interval (the existing specification says every five minutes).
- All stored timestamps must use a consistent UTC strategy; render dates/times in the viewer's local timezone and label the timezone where ambiguity matters.
- Define whether `cooked_time` is required or optional; do not infer it from the expiry time.

### 8.6 Quantity

The supplied implementation spec says claim quantity is currently fixed to `1`. For MVP, choose and document one behavior:

- **Simplest MVP:** one claim reserves the entire listing; omit requested quantity from the receiver form.
- **Partial quantity support:** receivers request a quantity and the system tracks remaining quantity; this requires a more complex allocation model.

**Recommendation:** use the simplest MVP unless partial allocation is a confirmed product requirement.

---

## 9. Data Model

Use relational tables and foreign keys. Names below describe the target model; adapt naming only consistently.

### 9.1 Core tables

#### `profiles`

- `id` (UUID, primary key, tied to auth user)
- `full_name`
- `email` (unique; managed/verified through auth where possible)
- `phone_number` (private)
- `profile_image_url` (optional)
- `organization_name` (optional)
- `address`, `city`, `state`, `pincode` (optional profile address)
- `latitude`, `longitude` (optional; do not require a home location)
- `is_verified` (default false until a real verification flow exists)
- `is_active` (default true)
- `role` (`DONOR`, `RECEIVER`, `ADMIN`; admin assignment is privileged)
- `created_at`, `updated_at`

#### `food_categories`

- `id`
- `name` (unique)
- `description` (optional)
- `is_active`

#### `donations`

- `id`
- `donor_id` → `profiles.id`
- `title`, `description`
- `category_id` → `food_categories.id` (optional only if product rules allow it)
- `quantity`, `quantity_unit`
- `cooked_time` (nullable if not known)
- `expiry_time` (required)
- `pickup_address`, `city`, `state`, `pincode`
- `latitude`, `longitude` (required for radius search; manual-address-only fallback must be defined)
- `image_path` or `image_url` (optional)
- `status`
- `is_emergency`
- `created_at`, `updated_at`

#### `donation_requests`

- `id`
- `donation_id` → `donations.id`
- `receiver_id` → `profiles.id`
- `requested_quantity` (omit if whole-listing MVP is selected, or use a documented fixed value)
- `request_message` (optional)
- `status`
- `requested_at`, `approved_at`, `rejected_at`, `completed_at`
- Unique/conditional constraint to prevent duplicate active claims by the same receiver for the same donation, according to the chosen policy.

#### `pickup_tracking`

- `id`
- `donation_request_id` (unique FK)
- `pickup_person_name`
- `pickup_phone`
- `pickup_time`
- `verification_code_hash` (store a hash if practical; never expose it to donor-facing reads)
- `verification_attempts`
- `pickup_status`
- `receiver_latitude`, `receiver_longitude`
- `last_location_update`
- `created_at`, `updated_at`

#### `conversations`

- `id`
- `donation_id`
- `donor_id`
- `receiver_id`
- `created_at`, `updated_at`
- Unique constraint on the donation/donor/receiver tuple.

#### `messages`

- `id`
- `conversation_id`
- `sender_id`
- `message_text`
- `is_read`
- `sent_at`

#### `notifications`

- `id`
- `user_id`
- `title`, `message`, `type`, `link`
- `is_read`
- `created_at`

#### `audit_logs`

- `id`
- `actor_id` (nullable for system actions)
- `action`
- `target_type`, `target_id`
- `metadata` (avoid storing secrets)
- `created_at`

### 9.2 Later tables

Only add when the related feature is implemented:

- `ratings`
- `reports`
- `donation_metrics`
- `password_reset_tokens` (often unnecessary if handled by the auth provider)
- `login_attempts` (only if not adequately covered by the chosen auth provider and backend controls)
- `refresh_tokens` (avoid implementing a parallel token system if the auth provider already manages refresh securely)

### 9.3 Data-model constraints

- Use foreign keys and indexes for common lookup paths.
- Add indexes for donation status, expiry, creation time, donor ID, receiver ID, and conversation participant lookup.
- Enforce state transitions and ownership in trusted code, with RLS as a second layer.
- Avoid storing sensitive pickup details in public donation records.
- Decide retention/deletion behavior for accounts, messages, audit events, and completed donations before public launch.

---

## 10. Target API / Service Contracts

In the recommended Supabase architecture, clients can use Supabase's authenticated data APIs for permitted CRUD operations, but sensitive transitions must go through trusted Edge Functions or transactional database functions. Do not reproduce the old Spring endpoints one-for-one if a safer simpler contract is possible.

### 10.1 Authentication and profile

- Sign up: email, password, full name, selected role (`DONOR` or `RECEIVER`).
- Sign in: email/password.
- Sign out: use the auth provider's session handling.
- Refresh: use the provider's supported session refresh.
- Read/update profile: only the signed-in user's allowed fields.
- Role assignment: `ADMIN` only through a trusted administrative operation.

### 10.2 Donations

- List available donations: pagination, search, category, and sort.
- Get public donation detail: safe public fields only.
- Get nearby donations: latitude, longitude, radius; return distance and nearest-first order.
- Create donation: trusted identity determines `donor_id`; validate expiry and coordinates.
- Update donation: owner only, and only while `AVAILABLE`.
- Cancel donation: owner only and only when no approved pickup prevents cancellation.
- Expire donations: scheduled trusted job; never depend only on client-side filtering.

### 10.3 Claims

- Create claim: receiver identity comes from the session; server checks donation status/expiry and duplicate claims.
- Approve claim: trusted atomic operation; selected claim approved, donation reserved, competitors rejected.
- Reject claim: owner donor only.
- Cancel claim: receiver only; apply the approved-claim release policy.
- List my claims: receiver-scoped.
- List claims for a donation: owner donor only.

### 10.4 Pickup

- Start pickup: receiver with approved claim only; one tracking record; secure six-digit code.
- Update location: receiver with active tracking only; validate coordinate range and update rate.
- Subscribe to live location: short-lived scoped token or authenticated streaming mechanism; verify participant on the server.
- Verify handover: donor participant only; enforce attempt limits; transactionally update tracking, claim, and donation.
- Cancel pickup: receiver only; enforce the documented release policy.

### 10.5 Chat, notifications, admin

- Conversations: list only conversations where the current user is donor or receiver.
- Messages: read/send only within a conversation the user participates in.
- Notifications: list own notifications, unread count, mark one/all read.
- Admin stats: admin only; return real database aggregates.
- Admin users: admin only; server-side search, role/status filtering, pagination.
- Admin mutations: log role changes, suspension/reactivation, and deletion.

### 10.6 Error contract

Return consistent, actionable errors. The UI should distinguish:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT` (e.g. donation no longer available)
- `EXPIRED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Never return stack traces, secrets, raw database errors, or verification codes in error messages.

---

## 11. Security and Privacy Requirements

These are release blockers, not optional polish.

1. **Secrets:** Remove any committed database credentials from the old repository and rotate any credentials that were exposed. Use environment variables or managed secrets.
2. **Role assignment:** Public signup accepts only `DONOR` or `RECEIVER`. Never trust a client-supplied `ADMIN` role.
3. **RLS:** Enable and test Row Level Security for all exposed Supabase tables.
4. **Atomic approval:** Only one claim can win; concurrent approval tests must pass.
5. **Handover code:** Generate with a cryptographically secure random source; enforce a failed-attempt limit and cooldown. Do not return the code to the donor via any read endpoint.
6. **Live tracking:** Require participant authorization, explicit location permission, active pickup state, and limited retention of location data.
7. **SSE/live stream:** Browser `EventSource` cannot normally attach an arbitrary bearer header. Use a short-lived, request-scoped stream token validated server-side, or authenticated fetch streaming. Never make the endpoint public as a workaround.
8. **Authentication throttling:** Rate-limit login, signup, claim creation, location updates, messaging, and code verification.
9. **CORS and deployment:** Use explicit environment-specific origins; do not use a wildcard with credentials.
10. **Input validation:** Validate on the server even if the frontend uses a schema validator.
11. **Privacy:** Public listing responses must not contain personal phone numbers, receiver GPS coordinates, verification codes, or private profile data.
12. **Audit:** Record sensitive administrative changes and security-relevant events without logging passwords, tokens, or verification secrets.
13. **Data retention:** Define when live location is deleted or anonymised and how account deletion affects related records.
14. **Database access:** Keep service-role credentials exclusively in trusted server-side functions.

---

## 12. Notifications and Live Updates

### MVP notifications

Create in-app notifications for:

- New claim received (donor).
- Claim approved (receiver).
- Claim rejected (receiver).
- Competing claim auto-rejected (receiver).
- Claim cancelled (donor).
- Donation expired (donor).
- Pickup started (donor).
- Pickup verified (receiver).
- Pickup cancelled (donor).

Notification failure must not leave a core transaction partially completed. If a notification is not immediately delivered, the application should still show the correct authoritative status on refresh.

### Delivery model

For the first release, database-backed in-app notifications fetched on screen load and after important actions are acceptable. Polling or realtime delivery can be added after correctness and authorization are proven.

### Live location

- Start only after an approved claim and explicit user action.
- Ask for browser geolocation permission.
- Send location at a sensible interval and only while pickup is active.
- Display the last update time.
- Stop sending on completion, cancellation, sign-out, or page/session teardown.
- Do not retain detailed location history unless a clear product requirement is approved.
- A stale location must be visibly labelled as stale.

---

## 13. Non-Functional Requirements

| Area | Target |
|---|---|
| Responsive UI | Works on mobile, tablet, and desktop browsers |
| Performance | Common feed and detail interactions feel responsive; establish and measure concrete budgets during implementation |
| Security | Server-side authorization, RLS, secret management, rate limiting, and tested state transitions |
| Accessibility | Aim for WCAG 2.1 AA; keyboard navigation, contrast, focus visibility, semantic forms |
| Reliability | Retry-safe actions and authoritative refetch after conflicts/timeouts |
| Observability | Structured server logs, error reporting, and health visibility without sensitive values |
| Testing | Unit tests for rules; integration tests for transaction and permission boundaries; end-to-end tests for main journeys |
| Browser support | Current stable Chrome, Edge, Firefox, and Safari; responsive mobile browsers |
| Time handling | Store timestamps consistently in UTC; display in local timezone |
| Location privacy | Share only with the pickup participants while tracking is active |

---

## 14. Implementation Phases

Do not proceed to the next phase until the current phase's exit criteria pass.

### Phase 0 — Project decision and setup

Tasks:
1. Decide whether this is a clean rebuild or a migration of the existing repository.
2. Inspect the current repo and record what must be preserved.
3. Confirm whether existing user/donation data must migrate.
4. Create the target React + TypeScript + Vite app.
5. Set up Supabase project, local environment variables, schema migrations, and separate development data.
6. Configure linting, formatting, test runner, and environment examples.
7. Port design tokens and core UI patterns.

Exit criteria:
- App runs locally.
- No secrets are committed.
- Database migrations can create the schema from an empty database.
- Environment setup is documented.

### Phase 1 — Authentication, roles, and profiles

Tasks:
1. Signup with explicit donor/receiver role.
2. Login/logout and protected routes.
3. Create profile after signup.
4. Implement RLS and role policies.
5. Build profile page and account status handling.
6. Add tests for unauthorized access and role escalation.

Exit criteria:
- Donor and receiver can sign up and sign in.
- Public signup cannot create an admin.
- Users cannot read or update another user's private profile.
- Suspended accounts cannot perform protected actions.

### Phase 2 — Donations and discovery

Tasks:
1. Categories and donation schema.
2. Create/edit/cancel donation forms.
3. Public feed, filters, pagination, detail page.
4. Nearby query and distance display.
5. Map markers and popup.
6. Expiry job and expiry-state handling.
7. Tests for ownership, expiry, and public data privacy.

Exit criteria:
- Donor can publish a valid listing.
- Listing appears in feed and map.
- Non-owner cannot edit/cancel it.
- Expired listings cannot be claimed or approved.

### Phase 3 — Claim lifecycle and arbitration

Tasks:
1. Create claim with optional message.
2. Donor claim review screen.
3. Approve/reject/cancel flows.
4. Atomic approval function and competing-claim rejection.
5. Notifications for every transition.
6. Concurrent approval and duplicate-claim integration tests.

Exit criteria:
- Exactly one claim can be approved for a donation.
- Competing pending claims are rejected in the same transaction.
- Unauthorized users cannot approve/reject claims.
- Failed/conflicting operations show a clear UI message and refresh current state.

### Phase 4 — Verified pickup and tracking

Tasks:
1. Start pickup from approved claim.
2. Secure six-digit code generation and attempt throttling.
3. Receiver-only code display.
4. Location permission, location update service, donor live view.
5. Participant-scoped live stream authorization.
6. Handover verification transaction.
7. Cancellation and cleanup behavior.

Exit criteria:
- Only an approved receiver can start pickup.
- Donor cannot retrieve the secret code through any API.
- Wrong code does not complete the claim.
- Correct code updates tracking, claim, and donation consistently.
- Live location is unavailable to non-participants and stops after completion/cancellation.

### Phase 5 — Chat, notifications, dashboards, admin

Tasks:
1. Donation-scoped conversations and message authorization.
2. Notification inbox, unread count, mark-read.
3. Donor/receiver dashboards using real data.
4. Admin user search/filter/pagination.
5. Admin role/status actions and audit events.
6. Empty/error/loading states and responsive review.

Exit criteria:
- Users cannot read another conversation.
- Notification ownership is enforced.
- Admin filters work server-side.
- Dashboard figures are computed from real data, not mock values.

### Phase 6 — Hardening and launch readiness

Tasks:
1. End-to-end tests for donor → receiver → verified handover.
2. Review all RLS policies and API/function permissions.
3. Add rate limiting and safe error responses.
4. Review secret handling, CORS, and production environment setup.
5. Run accessibility and responsive checks.
6. Configure backups, logs, and operational alerts.
7. Decide data retention and deletion behavior.
8. Perform a migration rehearsal if old data must be moved.

Exit criteria:
- No known critical authorization gaps.
- No secrets in source control.
- Core workflow tests pass in a clean test environment.
- Production configuration is separate from development.
- Rollback/cutover steps are documented.

### Later phase — Trust, impact, and advanced logistics

Only after the core is stable:
- Ratings and reviews.
- Reports and moderation.
- Real rescued-weight/servings/CO₂ estimates with documented assumptions.
- Email/SMS or push notifications.
- Multi-stop routes, ETA predictions, demand signals, offline GPS buffering.
- Partner/NGO bulk claims and recurring surplus.

---

## 15. Acceptance Criteria — MVP Definition of Done

### Authentication and permissions

- [ ] A user can register as `DONOR` or `RECEIVER`.
- [ ] Public signup cannot assign `ADMIN`.
- [ ] Protected routes redirect or return a proper unauthenticated response.
- [ ] Server/database authorization blocks cross-user data access.
- [ ] Suspended accounts cannot perform protected actions.

### Donations

- [ ] Donor can create a listing with required details, expiry, and pickup location.
- [ ] Valid listings appear in the public feed and map.
- [ ] Feed supports search, category filtering, and pagination.
- [ ] Nearby search returns available listings within the selected radius, nearest first.
- [ ] Non-owners cannot edit or cancel a donation.
- [ ] Expired listings cannot be claimed or approved.

### Claims

- [ ] Receiver can claim an available donation.
- [ ] Duplicate active claims by the same receiver are prevented.
- [ ] Donor can approve exactly one eligible claim.
- [ ] Approval reserves the donation and rejects all other pending claims atomically.
- [ ] Only the donor owner can approve/reject a claim.
- [ ] Cancellation releases a reserved donation only under the defined policy.

### Pickup and handover

- [ ] Only the approved receiver can start pickup.
- [ ] One tracking record exists per claim.
- [ ] The receiver can see the six-digit code; the donor cannot retrieve it through an API.
- [ ] Invalid code leaves tracking `EN_ROUTE` and does not complete the claim.
- [ ] Verification attempts are limited.
- [ ] Correct code sets tracking `VERIFIED`, claim `COMPLETED`, and donation `PICKED_UP` atomically.
- [ ] Only participants can access live location.
- [ ] Tracking stops on completion or cancellation.

### Chat, notifications, and admin

- [ ] Only conversation participants can read/send messages.
- [ ] Users can see and mark their own notifications read.
- [ ] Dashboard counters use real database values.
- [ ] Admin can search/filter/paginate users.
- [ ] Only admins can perform admin actions, and sensitive actions are audited.

### Quality

- [ ] Main screens include loading, empty, and error states.
- [ ] Core role and state-transition tests pass.
- [ ] Responsive and keyboard-accessibility checks are completed.
- [ ] No secrets are committed.
- [ ] Local setup and deployment environment variables are documented.

---

## 16. Google AI Studio Workflow

### 16.1 Working rules for AI Studio

Use AI Studio as a coding partner, not as the sole source of truth.

For every task:
1. State the phase and exact scope.
2. Ask it to inspect the relevant existing files before editing.
3. Tell it which architecture and requirements are fixed.
4. Tell it what must not change.
5. Ask for a concise change summary and the files changed.
6. Run the app and tests.
7. Fix errors before starting the next task.
8. Review database policies and trusted functions manually; do not accept security-critical code without testing.

### 16.2 Master project prompt

Use this at the start of a new AI Studio project:

> You are the senior full-stack engineer building FoodSaver, a free surplus-food sharing web application. Follow the attached FoodSaver AI Studio–Ready Product & Build Specification as the source of truth.
>
> **Target stack:** React + TypeScript + Vite, React Router, Tailwind CSS, Supabase Auth, PostgreSQL, RLS, Supabase Storage, and trusted Supabase Edge Functions/database transactions for security-sensitive operations. Use Leaflet for maps and isolate routing behind a service.
>
> **Product flow:** Donor creates a surplus-food listing → receiver discovers and claims it → donor approves one claim only → competing pending claims are rejected atomically → approved receiver starts pickup and shares location → donor verifies a secure six-digit handover code → claim completes and donation becomes picked up.
>
> **Rules:** This is a free coordination platform, not a delivery/payment marketplace. Never add payments, checkout, courier dispatch, or a native mobile app unless explicitly requested. Never trust client-supplied roles, ownership, status transitions, or verification results. Never expose secrets or verification codes to unauthorized users. Enforce permissions in trusted backend/database code and test RLS.
>
> Work in small phases. Do not generate the entire product in one step. First inspect the current project and report the architecture, existing features, missing features, risks, and proposed file changes. Do not overwrite working code without explaining why. If the project is empty, scaffold only the foundation required for Phase 0. After every task, list files changed, commands/tests to run, known limitations, and the next smallest task. Do not claim a feature is complete unless it has been implemented and the relevant acceptance criteria have been tested.

### 16.3 Task prompt template

Reuse this for each task:

> Implement **[specific task]** for FoodSaver, following the attached specification.
>
> **Phase:** [phase number and name]  
> **Scope:** [only the feature being implemented]  
> **Must preserve:** [existing behaviors, API contracts, design tokens]  
> **Security rules:** [role/ownership/data restrictions]  
> **Acceptance criteria:** [copy the relevant checklist items]
>
> First inspect the relevant files and explain the smallest safe implementation plan. Then implement the task. Add or update tests for the business rules and error cases. Run available checks and report the actual results. Do not implement unrelated future features, add unnecessary dependencies, invent mock production data, or mark untested behavior as complete.

### 16.4 Recommended first task

Do not start with all screens or the map. Start with repository/architecture assessment:

> Inspect this project and compare it with the FoodSaver specification. Do not make changes yet. Report: (1) current frontend/backend stack, (2) existing features and their entry-point files, (3) configuration and secrets risks without printing secret values, (4) data that may need migration, (5) the smallest safe path to the recommended React + Supabase architecture, and (6) unresolved decisions that block migration. Separate facts found in code from assumptions. Do not modify files.

After reviewing the assessment, choose clean rebuild or incremental migration, then proceed to Phase 0.

---

## 17. Decisions That Still Need Product Confirmation

These are deliberately not silently decided by this document.

| Question | Recommended default | Why it matters |
|---|---|---|
| Is the existing FoodSaver repository/data already used by real users? | Confirm before migration | Determines whether clean rebuild is safe |
| Must existing accounts and donations be preserved? | Migrate only if required | Adds data mapping, password/auth migration, and cutover work |
| Is whole-listing claim sufficient, or can receivers claim partial quantity? | Whole listing for MVP | Partial allocation significantly complicates inventory and concurrency |
| Is a pickup address required if browser geolocation is unavailable? | Require a usable pickup address; coordinates for map/radius features | Prevents unusable listings |
| Can an approved receiver cancel after starting pickup? | Allow only under a defined policy; do not silently release while in transit | Avoids two receivers arriving for the same food |
| Should live tracking be mandatory or optional? | Optional with clear status if permission is denied | Browser permissions and privacy differ by device |
| How long should live location, messages, audit logs, and completed records be retained? | Define before public launch | Privacy and operational implications |
| Which hosting provider should serve the frontend? | Decide after the first local build | Deployment choice affects environment setup, not the core product model |
| Should email/SMS notifications be part of the first release? | No; in-app notifications first | Reduces setup and verification work |

---

## 18. Source Context: Existing FoodSaver Specification

The supplied FoodSaver spec describes these existing components and behaviors. Treat them as claims from the supplied document until the repository is inspected:

- Frontend: Vue 3 Composition API, Vite, Tailwind CSS, Pinia, Vue Router, Axios, Leaflet, Chart.js.
- Backend: Java 21, Spring Boot 3.5, Spring Security/JWT, Spring Data JPA.
- Database: PostgreSQL hosted through Supabase.
- Existing documented features: JWT authentication and roles, donation CRUD, discovery feed, Haversine nearby search, Leaflet map, claim lifecycle, expiry scheduler, pickup tracking, six-digit verification, OSRM routing, donation-scoped chat, in-app notifications, admin stats/user management.
- Documented gaps: live-location SSE authentication, committed database credentials, signup role default mismatch, non-cryptographic code generation, missing verification-attempt throttling, hard-coded CORS, schema migration strategy, admin filters, profile page, donation detail page, ratings/reports/impact/password-reset/image-upload work, and automated tests.
- The original spec also says the profile route is a placeholder, admin search/filter parameters are ignored by the backend, image storage is URL-only, and impact numbers may be mock values.

**Important:** If the repository differs from this list, record the discrepancy and update the implementation plan. Do not assume a feature is present merely because it appears in the original document.

---

## 19. Final Build Principle

Build the smallest correct version of the core flow first:

**Account → Donation → Discovery → Claim → Single approval → Pickup → Verified handover.**

Chat, notifications, dashboards, and admin tools support that flow. Ratings, impact analytics, AI matching, and advanced routing come later.

A feature is complete only when its happy path, forbidden actions, failure states, and acceptance criteria have been tested.
