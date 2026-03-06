// ConnectShyft provider-registry route integration entrypoint kept for command compatibility.
// Tests are split into focused modules for maintainability and triage speed.
import './connectshyft.provider-registry.dispatch-events.test';
import './connectshyft.provider-registry.guardrails.test';
import './connectshyft.provider-registry.webhook-correlation-resolution.test';
import './connectshyft.provider-registry.webhook-correlation-refusals.test';
import './connectshyft.provider-registry.webhook-replay-signature.test';
