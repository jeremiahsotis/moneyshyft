import type { SubjectContext } from '@shyft/contracts';
import { InjectionKey, Ref, inject, ref } from 'vue';

export const SUBJECT_CONTEXT_KEY: InjectionKey<Ref<SubjectContext>> = Symbol('subject-context');

export function createSubjectContext() {
  return ref<SubjectContext>({
    orgUnitId: 'demo-org',
  });
}

export function useSubjectContext() {
  const ctx = inject(SUBJECT_CONTEXT_KEY);
  if (!ctx) {
    throw new Error('SubjectContext not provided');
  }
  return ctx;
}
