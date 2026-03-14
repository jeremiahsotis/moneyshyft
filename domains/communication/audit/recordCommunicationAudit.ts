import { CommunicationAuditEntry } from './auditTypes'

export type CommunicationAuditRepository = {
  append(entry: CommunicationAuditEntry): Promise<void>
}

export function buildRecordCommunicationAudit(repository: CommunicationAuditRepository) {
  return async function recordCommunicationAudit(
    input: Omit<CommunicationAuditEntry, 'id' | 'createdAt'>,
  ) {
    const entry: CommunicationAuditEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...input,
    }
    await repository.append(entry)
    return entry
  }
}
