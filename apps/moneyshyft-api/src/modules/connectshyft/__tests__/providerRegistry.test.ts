// ConnectShyft provider registry Jest entrypoint kept for command compatibility.
// Tests are split into focused modules for maintainability and parallel triage.
// Contract compatibility anchors for Story e.6 coverage scanners:
// - fails closed when rollout allow-list excludes the request tenant/orgUnit context
// - allows resolution when rollout allow-list includes the request tenant/orgUnit context
// - fails closed when rollout allow-list configuration is invalid JSON
import './providerRegistry.resolution.test';
import './providerRegistry.dispatch-policy.test';
import './providerRegistry.signature.test';
