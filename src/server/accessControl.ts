import { User } from '../types';

type AppAccess = Pick<User, 'role' | 'verifiedOfficial'>;

export function hasSystemAdminCapabilities(user: AppAccess | null | undefined): boolean {
  if (!user || typeof user !== 'object') return false;

  return user.role === 'SYSTEM_ADMIN' ||
    (user.role === 'BARANGAY_OFFICIAL' && user.verifiedOfficial === true);
}
