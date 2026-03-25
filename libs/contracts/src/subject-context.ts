export type SubjectContext = {
  orgUnitId: string;
  personId?: string;
  provisionalPersonId?: string;
  candidatePersonIds?: string[];
  conversationId?: string;
  contactPointId?: string;
  threadId?: string;
  identityState?: SubjectIdentityState;
};

export const SUBJECT_IDENTITY_STATES = [
  'confirmed',
  'provisional',
] as const;

export type SubjectIdentityState = typeof SUBJECT_IDENTITY_STATES[number];

export function validateSubjectContext(subject: SubjectContext): void {
  if (subject.personId && subject.provisionalPersonId) {
    throw new Error('SubjectContext cannot include both personId and provisionalPersonId');
  }

  if (subject.identityState === 'confirmed' && subject.provisionalPersonId) {
    throw new Error('Confirmed SubjectContext cannot include provisionalPersonId');
  }

  if (subject.identityState === 'provisional' && subject.personId) {
    throw new Error('Provisional SubjectContext cannot include personId');
  }
}
