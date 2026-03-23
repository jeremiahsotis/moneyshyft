export type SubjectContext = {
  orgUnitId: string;
  personId?: string;
  provisionalPersonId?: string;
  conversationId?: string;
  contactPointId?: string;
};

export function validateSubjectContext(subject: SubjectContext): void {
  if (subject.personId && subject.provisionalPersonId) {
    throw new Error('SubjectContext cannot include both personId and provisionalPersonId');
  }
}
