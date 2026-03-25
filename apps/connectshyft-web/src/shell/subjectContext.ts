import type {
  SubjectContext,
  SubjectIdentityState,
} from '@shyft/contracts';
import { validateSubjectContext } from '@shyft/contracts';
import { InjectionKey, Ref, inject, ref } from 'vue';

export const SUBJECT_CONTEXT_KEY: InjectionKey<Ref<SubjectContext>> = Symbol('subject-context');

export const createEmptySubjectContext = (orgUnitId = ''): SubjectContext => ({
  orgUnitId,
});

export type ShellSubjectSummary = {
  orgUnitId: string;
  hasSubject: boolean;
  hasPersonContext: boolean;
  hasConversationContext: boolean;
  hasContactPointContext: boolean;
  hasThreadContext: boolean;
  candidatePersonCount: number;
  identityState: SubjectIdentityState | null;
};

const cloneSubjectContext = (subjectContext: SubjectContext): SubjectContext => ({
  ...subjectContext,
  candidatePersonIds: subjectContext.candidatePersonIds
    ? [...subjectContext.candidatePersonIds]
    : undefined,
});

export const subjectContextHasActiveSubject = (
  subjectContext: SubjectContext | null | undefined,
): boolean => Boolean(
  subjectContext
  && (
    subjectContext.personId
    || subjectContext.provisionalPersonId
    || subjectContext.threadId
    || subjectContext.conversationId
    || subjectContext.contactPointId
    || subjectContext.candidatePersonIds?.length
  ),
);

export const clearSubjectContext = (
  subjectContext: Ref<SubjectContext>,
  orgUnitId = '',
): void => {
  subjectContext.value = createEmptySubjectContext(orgUnitId);
};

export const replaceSubjectContext = (
  subjectContext: Ref<SubjectContext>,
  nextSubjectContext: SubjectContext,
): void => {
  const clonedSubjectContext = cloneSubjectContext(nextSubjectContext);
  validateSubjectContext(clonedSubjectContext);
  subjectContext.value = clonedSubjectContext;
};

export const resolveShellSubjectSummary = (
  subjectContext: SubjectContext | null | undefined,
): ShellSubjectSummary => ({
  orgUnitId: subjectContext?.orgUnitId || '',
  hasSubject: subjectContextHasActiveSubject(subjectContext),
  hasPersonContext: Boolean(subjectContext?.personId || subjectContext?.provisionalPersonId),
  hasConversationContext: Boolean(subjectContext?.conversationId),
  hasContactPointContext: Boolean(subjectContext?.contactPointId),
  hasThreadContext: Boolean(subjectContext?.threadId),
  candidatePersonCount: subjectContext?.candidatePersonIds?.length || 0,
  identityState: subjectContext?.identityState || null,
});

export function createSubjectContext(): Ref<SubjectContext> {
  return ref<SubjectContext>(createEmptySubjectContext());
}

export function useSubjectContext(): Ref<SubjectContext> {
  const ctx = inject(SUBJECT_CONTEXT_KEY);
  if (!ctx) {
    throw new Error('SubjectContext not provided');
  }
  return ctx;
}
