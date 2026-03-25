import { validateSubjectContext } from '@shyft/contracts';
import { describe, expect, it } from 'vitest';
import {
  resolveShellSubjectSummary,
  subjectContextHasActiveSubject,
} from '../subjectContext';

describe('SubjectContext', () => {
  it('rejects contexts that carry both confirmed and provisional ids', () => {
    expect(() =>
      validateSubjectContext({
        orgUnitId: 'org-connectshyft-web-1',
        personId: 'person-connectshyft-web-1',
        provisionalPersonId: 'person-connectshyft-web-2',
      }),
    ).toThrow('SubjectContext cannot include both personId and provisionalPersonId');
  });

  it('treats thread and candidate person context as active shared subject state', () => {
    expect(subjectContextHasActiveSubject({
      orgUnitId: 'org-connectshyft-web-1',
      threadId: 'thread-connectshyft-web-1',
      candidatePersonIds: ['person-connectshyft-web-1'],
    })).toBe(true);
  });

  it('builds a stable summary shape for future shell subject presentation', () => {
    expect(resolveShellSubjectSummary({
      orgUnitId: 'org-connectshyft-web-1',
      provisionalPersonId: 'person-connectshyft-web-1',
      candidatePersonIds: ['person-connectshyft-web-1', 'person-connectshyft-web-2'],
      conversationId: 'conversation-connectshyft-web-1',
      contactPointId: 'contact-point-connectshyft-web-1',
      threadId: 'thread-connectshyft-web-1',
      identityState: 'provisional',
    })).toEqual({
      orgUnitId: 'org-connectshyft-web-1',
      hasSubject: true,
      hasPersonContext: true,
      hasConversationContext: true,
      hasContactPointContext: true,
      hasThreadContext: true,
      candidatePersonCount: 2,
      identityState: 'provisional',
    });
  });
});
