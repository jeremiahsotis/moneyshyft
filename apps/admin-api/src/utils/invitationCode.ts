import { randomBytes } from 'crypto';

/**
 * Generate a unique 6-character alphanumeric invitation code
 * Format: ABC123 (uppercase letters and numbers only)
 * Excludes ambiguous characters (0, O, 1, I) for easier verbal sharing
 */
export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0, O, 1, I)
  let code = '';
  const bytes = randomBytes(6);

  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }

  return code;
}
