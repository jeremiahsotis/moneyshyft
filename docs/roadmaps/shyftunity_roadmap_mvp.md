# ShyftUnity MVP Roadmap

This roadmap consolidates the remaining work required to bring **ShyftUnity** (PeopleCore, ConnectShyft and the unified application shell) to a launch‑ready Minimum Viable Product.  It is organised by theme and suggests an order of execution that minimises rework.  WorkIntent has been explicitly deferred and is not included.

## Completed (Slices 22–27)

- Deterministic identity scoring with explainable confidence bands and penalties for shared, stale or reassignment‑suspected contact points.
- Telephony readiness gate with persistent operator callback numbers and clear blocking reasons.
- Activity model and thread/activity binding support.
- Bridge lifecycle and call persistence; provisional person rebinding and merge flows.
- Contact point lifecycle states (`active_personal` through `archived`) with event‑driven status computation.
- Contracts updated to include `contactPointStatus`, and UI indicators for shared, stale and reassignment states.

## Outstanding Items (Required for Launch)

1. **Telephony Runtime & Completion**  
   Stabilise calls and bridges before polishing the UI.

   - **Call Start & Bridge Reliability (PR 1)** – Finalise the call initiation route, ensure both operator and neighbour legs succeed or fail deterministically, and add retry/timeout logic.  
   - **Voicemail System (PR 2)** – Implement missed‑call detection, voicemail recording via Telnyx, persistent storage and retrieval APIs, and playback support.  
   - **Provider Reliability Layer (PR 3)** – Add webhook idempotency, retries and event reconciliation.  Persist provider events and derive call state from them.  
   - **Conversation Model Enhancements (PR 4)** – Complete Path 2 (dialer‑based call), persist call state in the timeline and implement error/retry handling.

2. **Ambiguity Handling & Resolver Actions**  
   Provide workflows to address ambiguous identities and high‑confidence matches.

   - **Ambiguity Workflow & UI (PR 5)** – Surface `resolver_required` threads, add escalation actions and show candidate reasons/risk flags.  
   - **Resolver Action APIs (PR 6)** – Expose endpoints to approve matches, merge persons or suppress contact points; persist audit logs.  
   - **Resolver UI & Dashboard (PR 7)** – Create a dashboard listing pending reviews and allow resolvers to merge/link/reassign with proper context.

3. **Provisional Identity & Rebinding**  
   Finish lifecycle management for provisional persons and ensure downstream objects follow rebind rules.

   - **Automatic Rebinding & Audit (PR 8)** – Automatically rebind all `auto_rebind` objects when provisional persons are resolved; record a rebinding history.  
   - **Resolver Approval for Rebinding (PR 9)** – Provide manual approval flows for `review_rebind` objects and allow suppression of rebind when appropriate.

4. **UX & Operational Refinements**  
   Bring the user interface up to the “THE_GOAL” designs and remove developer artefacts.

   - **Dialer & Call State UI (PR 10)** – Build an ad‑hoc dialer component, show call‑state indicators in the inbox and thread detail.  
   - **Voicemail & Error UI (PR 11)** – Add voicemail playback controls, process states, and user‑friendly error banners with retry options.  
   - **Visual & Navigation Polish (PR 12)** – Unify navigation, remove technical fields (IDs, debug strings), and adopt the final design language.

5. **Shared Application Shell & Unified UX**  
   Provide a top‑level shell (`app.shyftunity.com`) that hosts ConnectShyft, People views and future CaseShyft modules.

   - **Shell Skeleton (PR 13)** – Create a wrapper app that handles authentication, context and routing, and embeds existing microfrontends.  
   - **OrgUnit & Feature Flag Providers (PR 14–15)** – Implement context providers for tenant/orgUnit selection and a feature‑flag service with per‑org overrides.  
   - **Shell UX Polish (PR 16)** – Align the shell with the final visual language and embed navigation and subject context bars.

6. **Conversation Model & CaseShyft Readiness**  
   Prepare ConnectShyft to hand work off to CaseShyft and persist complete message history.

   - **Timeline & Message Persistence (PR 17)** – Finalise timeline projections for messages, calls and voicemails.  
   - **Case Creation Hooks (PR 18)** – Add API endpoints and UI affordances for creating cases from threads, and emit events for CaseShyft.  
   - **Work Queue Integration (PR 19)** – Implement a simple work queue for volunteers and persist tasks that will later become cases.

## Additional Decisions & Information Needed

- **Provider Integrations:** Decide on the definitive provider (Telnyx vs. Twilio) for voice and voicemail; collect webhook formats and failure semantics to implement idempotent processing correctly.
- **Bridge & Dialer Design:** Finalise the algorithm for bridge retries and timeouts; decide whether ad‑hoc calls (Path 2) require number validation or orgUnit scoping before dispatch.
- **Resolver Policy:** Document business rules for merging vs. linking, suppression thresholds, and escalation criteria.  Confirm which user roles have resolver privileges and how notifications should be delivered.
- **Rebind Classes:** Review the `auto_rebind`, `review_rebind` and `historical_only` classifications to ensure they cover all downstream objects (calls, voicemails, messages, activities, cases) and decide default behaviour when no class is explicitly set.
- **Unified Design Language:** Select or finalise the design system (component library, typography, colour palette) to align the inbox and thread detail screens with the “THE_GOAL” mockups and apply it consistently across the shell and embedded apps.
- **Architecture of the Application Shell:** Choose the microfrontend strategy (module federation, iframes, single‑SPA) and finalise authentication/session sharing across embedded apps.
- **CaseShyft Schema:** Define the case data model and the minimal fields required to create a case from a conversation.  Decide how timeline events map to case notes.
- **QA & Accessibility:** Determine test coverage targets, performance benchmarks and accessibility standards; plan for a pilot test with real users to validate flows before GA release.

## Getting Started

1. Review the **Telephony** tasks and ensure a comprehensive understanding of the provider APIs and existing call/bridge code.  Write technical design docs for call retries and voicemail storage.
2. Convene with product and design teams to finalise the **resolver workflow**, rebind policies and visual design guidelines for the unified shell and ConnectShyft screens.
3. Set up a separate development branch (e.g. `codex/telephony-completion`) and begin work on PR 1, following the order outlined above.
4. Parallelise UI and shell design work where possible, but avoid merging UI PRs until the underlying APIs are stable to minimise rework.

This roadmap should serve as a living document: as work progresses, update statuses and refine tasks to reflect the current state of the project.
