export type QueueItem = {
  threadId?: string;
  bucket?: string;
  state?: string;
  voicemailIndicator?: boolean;
  display?: {
    title?: string;
    preview?: string;
    timestampLabel?: string;
    urgencyLabel?: string;
    stateLabel?: string;
    contextPills?: string[];
    voicemailLabel?: string;
    inboundContext?: string;
    outboundContext?: string;
    neighborContext?: string;
    conferenceContext?: string;
    threadId?: string;
    priorityRank?: number;
    rawStateChip?: string;
    routingMetadata?: unknown;
    webhookMetadata?: unknown;
    systemMetadata?: unknown;
  };
};

export type QueueEnvelope = {
  ok?: boolean;
  code?: string;
  refusalType?: string;
  data?: {
    context?: {
      tenantId?: string;
      orgUnitId?: string;
      bypassedOrgUnitMembership?: boolean;
    };
    items?: QueueItem[];
  };
};

export type ThreadDetailEnvelope = {
  ok?: boolean;
  code?: string;
  errorType?: string;
  refusalType?: string;
  data?: {
    thread?: {
      threadId?: string;
      state?: string;
      timeline?: Array<{
        conversationType?: string;
        renderMode?: string;
        firstClass?: boolean;
      }>;
    };
    lifecycle?: {
      priorState?: string;
      nextState?: string;
      reopenedByInbound?: boolean;
      reopenedFromClosed?: boolean;
      sameThreadId?: boolean;
      noInboundAutoReopenSideEffects?: boolean;
    };
    uiFeedback?: {
      severity?: string;
      ariaLive?: string;
      presentation?: string;
      message?: string;
    };
    feedback?: {
      taxonomy?: string;
    };
  };
};

export type InboundWebhookEnvelope = {
  ok?: boolean;
  code?: string;
  data?: {
    thread?: {
      threadId?: string;
      state?: string;
    };
    lifecycle?: {
      reopenedByInbound?: boolean;
    };
    timeline?: {
      routingDecision?: string;
    };
    replaySafe?: {
      duplicate?: boolean;
      suppressedDomainWrites?: boolean;
      dedupeKey?: string | null;
    };
  };
};

export const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export const collectPrimaryCopy = (item: QueueItem): string[] => {
  const fields: string[] = [];

  const collect = (value: unknown): void => {
    if (typeof value !== 'string') {
      return;
    }

    const normalized = value.trim();
    if (normalized.length > 0) {
      fields.push(normalized);
    }
  };

  collect(item.display?.title);
  collect(item.display?.preview);
  collect(item.display?.timestampLabel);
  collect(item.display?.urgencyLabel);
  collect(item.display?.stateLabel);
  collect(item.display?.voicemailLabel);
  collect(item.display?.inboundContext);
  collect(item.display?.outboundContext);
  collect(item.display?.neighborContext);
  collect(item.display?.conferenceContext);

  if (Array.isArray(item.display?.contextPills)) {
    for (const pill of item.display.contextPills) {
      collect(pill);
    }
  }

  return fields;
};

export const readItems = (body: QueueEnvelope): QueueItem[] => {
  if (!Array.isArray(body.data?.items)) {
    return [];
  }

  return body.data.items;
};

export const resolveFeedbackTaxonomy = (
  body: ThreadDetailEnvelope,
): 'success' | 'refusal' | 'error' | null => {
  const explicitTaxonomy = body.data?.feedback?.taxonomy ?? body.data?.uiFeedback?.severity;
  if (
    explicitTaxonomy === 'success'
    || explicitTaxonomy === 'refusal'
    || explicitTaxonomy === 'error'
  ) {
    return explicitTaxonomy;
  }

  if (body.ok === true) {
    return 'success';
  }

  if (body.refusalType === 'business') {
    return 'refusal';
  }

  if (body.ok === false || body.errorType === 'system') {
    return 'error';
  }

  return null;
};
