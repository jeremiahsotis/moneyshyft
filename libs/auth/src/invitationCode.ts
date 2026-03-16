import { randomBytes } from 'crypto';

export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(6);

  for (let i = 0; i < 6; i += 1) {
    code += chars[bytes[i] % chars.length];
  }

  return code;
}
