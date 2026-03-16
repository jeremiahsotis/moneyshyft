# ShyftUnity SpecKit Bootstrap Prompts v1

## Purpose

These are the two bootstrap prompts to run before `/speckit.specify`.

Prompt 1 stabilizes the architecture and boundaries.
Prompt 2 prepares implementation sequencing and delivery context.

Use both before asking SpecKit to specify any major ShyftUnity module or cross-module feature.

---

# Bootstrap Prompt 1 — Architecture + Boundary Lock

Use this first.

```text
You are helping prepare a SpecKit-ready implementation package for ShyftUnity.

Treat the attached documents as the source of truth.

Before producing any implementation plan, lock and restate:

1. the exact feature or module being implemented
2. who uses it
3. what problem it solves now
4. what it owns
5. what it integrates with
6. what it explicitly does NOT own
7. the domain objects involved
8. the critical workflows involved
9. the consent, security, tenant, and audit constraints that apply
10. the extraction-ready boundaries that must be preserved for future lane or service separation

Do not invent new ownership if ownership is already defined in the source documents.
Do not flatten cross-module responsibilities.
Do not assume cross-tenant visibility from identity linkage.
Do not mix eligibility logic into referral logic.
Do not collapse documents and evidence into one thing.

Output format:
- Feature summary
- Personas
- Ownership boundaries
- Domain objects
- Workflow summary
- Integration points
- Security / consent / audit constraints
- Open questions only if truly unresolved in the source material
```

---

# Bootstrap Prompt 2 — Delivery + Sequencing Lock

Use this second.

```text
Using the locked architecture and source documents, prepare a SpecKit-ready delivery context for this work.

You must explicitly identify:

1. current repo/runtime context
2. dependencies that must land first
3. migration order
4. backend ownership
5. frontend ownership
6. API and event contract touchpoints
7. rollout / live-user constraints
8. definition of done
9. PR slice strategy that favors extraction-ready boundaries
10. what should be built now vs what should remain future hooks only

Important context to preserve:
- MoneyShyft PWA is the first delivery priority where relevant
- ConnectShyft omnichannel scope includes phone, SMS, MMS, email, webchat, and website forms
- intake/communications triage is prioritized before service matching/screening/documents
- ShyftUnity uses a central shell
- the shell is one monolithic frontend for MVP
- all new work must be extraction-ready
- admin-api/admin-web, moneyshyft-api/web, connectshyft-api/web, and migration-runner already exist

Output format:
- Existing repo/runtime assumptions
- Dependency order
- Migration order
- Build-now vs future-hook split
- Delivery risks
- Recommended PR slices
- Recommended acceptance criteria structure
```

---

# How to use the two prompts

## Step 1
Provide the source docs for the feature/module.

## Step 2
Run Bootstrap Prompt 1.

## Step 3
Run Bootstrap Prompt 2 using the output of Prompt 1 plus the original docs.

## Step 4
Use the stabilized outputs as the input context for `/speckit.specify`.

This reduces ambiguity and dramatically improves SpecKit output quality.
