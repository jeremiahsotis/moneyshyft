import type { SubjectContext } from '@shyft/contracts';
import { InjectionKey, Ref, inject, ref } from 'vue';

export const SUBJECT_CONTEXT_KEY: InjectionKey<Ref<SubjectContext>> = Symbol('subject-context');

const DEFAULT_SUBJECT_CONTEXT: SubjectContext = {
  orgUnitId: 'demo-org',
};

export function createSubjectContext(): Ref<SubjectContext> {
  return ref<SubjectContext>({
    ...DEFAULT_SUBJECT_CONTEXT,
  });
}

export function useSubjectContext(): Ref<SubjectContext> {
  const ctx = inject(SUBJECT_CONTEXT_KEY);
  if (!ctx) {
    throw new Error('SubjectContext not provided');
  }
  return ctx;
}
