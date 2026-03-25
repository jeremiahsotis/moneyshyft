import type { SubjectContext } from '@shyft/contracts';
import { InjectionKey, Ref, inject, ref } from 'vue';

export const SUBJECT_CONTEXT_KEY: InjectionKey<Ref<SubjectContext>> = Symbol('subject-context');

export const createEmptySubjectContext = (orgUnitId = ''): SubjectContext => ({
  orgUnitId,
});

export const subjectContextHasActiveSubject = (
  subjectContext: SubjectContext | null | undefined,
): boolean => Boolean(
  subjectContext
  && (
    subjectContext.personId
    || subjectContext.provisionalPersonId
    || subjectContext.conversationId
    || subjectContext.contactPointId
  ),
);

export const clearSubjectContext = (
  subjectContext: Ref<SubjectContext>,
  orgUnitId = '',
): void => {
  subjectContext.value = createEmptySubjectContext(orgUnitId);
};

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
