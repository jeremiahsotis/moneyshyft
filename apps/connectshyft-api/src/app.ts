import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type {
  ContactPointLinkSubjectType,
  ContactPointLinkType,
  ContactPointType,
  IdentityConfidenceBand,
  ResolverReview,
  ResolverReviewType,
} from '@shyft/contracts';
import logger from './utils/logger';
import {
  createContactPoint,
  createContactPointLink,
  createResolverReview,
  decideIdentity,
  listContactPoints,
  listResolverReviews,
} from '../../../domains/people';
import type { IdentityCandidateInput } from '../../../domains/people';

type CreateContactPointBody = {
  type: ContactPointType;
  normalizedValue: string;
  rawValue?: string;
};

type CreateContactPointLinkBody = {
  contactPointId: string;
  subjectType: ContactPointLinkSubjectType;
  subjectId: string;
  linkType: ContactPointLinkType;
  confidenceBand: IdentityConfidenceBand;
};

type IdentityDecisionBody = {
  candidates?: IdentityCandidateInput[];
};

type CreateResolverReviewBody = {
  tenantId?: string;
  orgUnitId?: string;
  reviewType: ResolverReviewType;
  reviewStatus?: ResolverReview['reviewStatus'];
  priority?: ResolverReview['priority'];
  triggerSourceType: string;
  triggerSourceId: string;
  conversationId?: string;
  provisionalPersonId?: string;
  candidatePersonIds?: string[];
  contactPointId?: string;
  confidenceBand?: IdentityConfidenceBand;
  confidenceReasons?: string[];
  riskFlags?: ResolverReview['riskFlags'];
  requestedByUserId?: string;
  assignedResolverUserId?: string;
  requestedAt?: string;
  startedAt?: string;
  resolvedAt?: string;
  resolutionType?: ResolverReview['resolutionType'];
  resolutionReason?: string;
  resolutionNotes?: string;
};

const app = express();
const useMinimalAppShell = process.env.CONNECTSHYFT_MINIMAL_APP === '1';
const noopMiddleware = (_req: any, _res: any, next: any) => next();
const optionalAuth = useMinimalAppShell ? noopMiddleware : require('./middleware/auth').optionalAuth;
const requestCorrelation = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/requestCorrelation').requestCorrelation;
const tenancyContext = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/tenancyContext').tenancyContext;
const authContext = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/authContext').authContext;
const responseEnvelope = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/responseEnvelope').responseEnvelope;
const csrfProtection = useMinimalAppShell
  ? noopMiddleware
  : require('./platform/middleware/csrfProtection').csrfProtection;
const connectShyftRouter = useMinimalAppShell
  ? express.Router()
  : require('./routes/api/v1/connectshyft').default;
const postMergePerson = useMinimalAppShell
  ? null
  : require('./modules/peoplecore/handlers/postMergePerson').postMergePerson;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({
  verify: (req: any, _res: any, buf: Buffer) => {
    req.rawBody = Buffer.from(buf);
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(optionalAuth);
app.use(requestCorrelation);
app.use(tenancyContext);
app.use(authContext);
app.use(responseEnvelope);

app.use((req: any, _res: any, next: any) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/work-intents', (_req: any, res: any) => {
  res.json({
    id: 'wi_1',
    status: 'open',
    intentType: 'needs_follow_up',
  });
});

app.get('/people/contact-points', (_req: any, res: any) => {
  res.json(listContactPoints());
});

app.post('/people/contact-points', (req: any, res: any) => {
  const body = req.body as CreateContactPointBody;
  const now = new Date().toISOString();
  const contactPoint = createContactPoint({
    tenantId: 'tenant_1',
    type: body.type,
    normalizedValue: body.normalizedValue,
    rawValue: body.rawValue,
    status: 'active_personal',
    firstSeenAt: now,
    lastSeenAt: now,
    suspectedShared: false,
    confirmedShared: false,
    reassignmentSuspected: false,
  });

  res.json(contactPoint);
});

app.post('/people/contact-point-links', (req: any, res: any) => {
  const body = req.body as CreateContactPointLinkBody;
  const now = new Date().toISOString();
  const contactPointLink = createContactPointLink({
    contactPointId: body.contactPointId,
    subjectType: body.subjectType,
    subjectId: body.subjectId,
    linkType: body.linkType,
    confidenceBand: body.confidenceBand,
    isCurrent: true,
    isPrimary: body.linkType === 'primary',
    manuallyConfirmed: false,
    firstLinkedAt: now,
    linkedBy: 'system',
  });

  res.json(contactPointLink);
});

app.post('/people/identity/decision', (req: any, res: any) => {
  const body = req.body as IdentityDecisionBody;

  res.json(decideIdentity(Array.isArray(body.candidates) ? body.candidates : []));
});

app.get('/people/resolver-reviews', (_req: any, res: any) => {
  res.json(listResolverReviews());
});

app.post('/people/resolver-reviews', (req: any, res: any) => {
  const body = req.body as CreateResolverReviewBody;
  const resolverReview = createResolverReview({
    tenantId: body.tenantId || 'tenant_1',
    orgUnitId: body.orgUnitId || 'org_1',
    reviewType: body.reviewType,
    reviewStatus: body.reviewStatus || 'pending',
    priority: body.priority || 'normal',
    triggerSourceType: body.triggerSourceType,
    triggerSourceId: body.triggerSourceId,
    conversationId: body.conversationId,
    provisionalPersonId: body.provisionalPersonId,
    candidatePersonIds: body.candidatePersonIds || [],
    contactPointId: body.contactPointId,
    confidenceBand: body.confidenceBand || 'low',
    confidenceReasons: body.confidenceReasons || [],
    riskFlags: body.riskFlags || [],
    requestedByUserId: body.requestedByUserId || 'system',
    assignedResolverUserId: body.assignedResolverUserId,
    requestedAt: body.requestedAt || new Date().toISOString(),
    startedAt: body.startedAt,
    resolvedAt: body.resolvedAt,
    resolutionType: body.resolutionType,
    resolutionReason: body.resolutionReason,
    resolutionNotes: body.resolutionNotes,
  });

  res.json(resolverReview);
});

app.use(csrfProtection);
if (postMergePerson) {
  app.post('/api/v1/peoplecore/persons/merge', postMergePerson);
}
app.use('/api/v1/connectshyft', connectShyftRouter);

app.use((req: any, res: any) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.use((error: unknown, _req: any, res: any, _next: any) => {
  logger.error('Unhandled connectshyft api error', error);
  res.status(500).json({
    ok: false,
    code: 'CONNECTSHYFT_UNHANDLED_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
});

export default app;
