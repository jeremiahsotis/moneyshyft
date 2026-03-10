import type { ConnectShyftNeighbor } from '@/features/connectshyft/neighbors';
import type { ConnectShyftThreadSummary } from '@/features/connectshyft/readContracts';

const TECHNICAL_COPY_PATTERN = new RegExp([
  'prefers[_\\s]?texting',
  'guardrail',
  'deterministic',
  'policy-safe',
  'same-thread',
  'reopen',
  '\\bthread\\b',
  'operator',
  'uuid',
  '\\bux\\s*r\\d\\b',
  'cs-number',
].join('|'), 'i');

const stripContextPrefix = (value: string, prefix: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  const pattern = new RegExp(`^${prefix}\\s*:\\s*`, 'i');
  return normalized.replace(pattern, '').trim();
};

const looksTechnical = (value: string): boolean => {
  return TECHNICAL_COPY_PATTERN.test(value);
};

const resolveVolunteerPreviewFallback = (value: string): string => {
  const lowered = value.toLowerCase();

  if (lowered.includes('voicemail')) {
    return 'Voicemail received and ready for follow-up.';
  }

  if (lowered.includes('prefers_texting') || lowered.includes('prefers texting')) {
    return 'Texting preference needs confirmation before the next outreach.';
  }

  if (lowered.includes('reopen')) {
    return 'Reopen the conversation before sending a new update.';
  }

  if (lowered.includes('claimed')) {
    return 'Another volunteer is already following up.';
  }

  if (lowered.includes('closed')) {
    return 'Conversation is closed until the next follow-up starts.';
  }

  if (lowered.includes('unclaimed')) {
    return 'Ready for volunteer follow-up.';
  }

  return 'Conversation activity recorded.';
};

export const resolveConnectShyftNeighborName = (
  thread: Pick<ConnectShyftThreadSummary, 'summary' | 'neighborContextLabel'>,
  neighbor?: Pick<ConnectShyftNeighbor, 'firstName' | 'lastName'> | null,
): string => {
  const neighborName = `${neighbor?.firstName || ''} ${neighbor?.lastName || ''}`.trim();
  if (neighborName) {
    return neighborName;
  }

  const contextLabel = stripContextPrefix(thread.neighborContextLabel || '', 'Neighbor context');
  if (contextLabel && !looksTechnical(contextLabel)) {
    return contextLabel;
  }

  const summary = thread.summary.trim();
  if (summary && !looksTechnical(summary)) {
    return summary;
  }

  return 'Neighbor follow-up';
};

export const resolveConnectShyftConferenceLabel = (
  thread: Pick<ConnectShyftThreadSummary, 'conferenceContextLabel' | 'preferredOutboundContextLabel'>,
): string => {
  const conferenceContext = stripContextPrefix(
    thread.conferenceContextLabel || '',
    'Conference context',
  );
  if (conferenceContext && !looksTechnical(conferenceContext)) {
    return conferenceContext;
  }

  const preferredOutbound = thread.preferredOutboundContextLabel.trim();
  if (preferredOutbound && !looksTechnical(preferredOutbound)) {
    return preferredOutbound;
  }

  return 'Conference follow-up queue';
};

export const resolveConnectShyftClaimLabel = (
  thread: Pick<ConnectShyftThreadSummary, 'claimContextLabel' | 'state' | 'claimedByUserId'>,
  actorUserId?: string | null,
): string => {
  if (thread.state === 'CLAIMED') {
    if (actorUserId && thread.claimedByUserId === actorUserId) {
      return 'Claimed by you';
    }

    return 'Claimed by another volunteer';
  }

  if (thread.state === 'CLOSED') {
    return 'Closed thread';
  }

  const claimContext = stripContextPrefix(thread.claimContextLabel || '', 'Claim context');
  return claimContext || 'Ready to claim';
};

export const resolveConnectShyftPreviewText = (
  thread: Pick<ConnectShyftThreadSummary, 'preview' | 'summary' | 'voicemailIndicator' | 'voicemailLabel'>,
): string => {
  if (thread.voicemailIndicator) {
    return thread.voicemailLabel || 'Voicemail received';
  }

  const preview = thread.preview.trim();
  if (preview && !looksTechnical(preview)) {
    return preview;
  }

  const summary = thread.summary.trim();
  if (summary && !looksTechnical(summary)) {
    return summary;
  }

  if (preview) {
    return resolveVolunteerPreviewFallback(preview);
  }

  if (summary) {
    return resolveVolunteerPreviewFallback(summary);
  }

  return 'Conversation activity recorded.';
};

export const resolveConnectShyftPreferenceChip = (
  neighbor?: Pick<ConnectShyftNeighbor, 'prefersTexting'> | null,
): string => {
  if (!neighbor) {
    return 'Texting preference unknown';
  }

  if (neighbor.prefersTexting === 'YES') {
    return 'Prefers texting';
  }

  if (neighbor.prefersTexting === 'NO') {
    return 'Prefers calls';
  }

  return 'Texting preference unknown';
};

export const formatConnectShyftTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value || 'Recently updated';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};
