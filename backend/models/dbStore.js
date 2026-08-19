import bcrypt from 'bcryptjs';

// Pre-hashed passwords for initial admin access: "Password123!"
const DEFAULT_HASH = bcrypt.hashSync('Password123!', 10);

export const db = {
  users: [
    {
      id: 'usr_admin',
      email: 'admin@copycraft.com',
      passwordHash: DEFAULT_HASH,
      name: 'System Administrator',
      phone: '+91 98765 43210',
      role: 'admin',
      collegeId: '',
      referralCode: 'ADMINVIP',
      deliveryPin: '910001',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_superadmin',
      email: 'superadmin@copycraft.com',
      passwordHash: DEFAULT_HASH,
      name: 'Super Admin',
      phone: '+91 99999 88888',
      role: 'super_admin',
      collegeId: '',
      referralCode: 'SUPER100',
      deliveryPin: '910002',
      createdAt: new Date().toISOString()
    }
  ],

  colleges: [],
  orders: [],
  inventory: [],
  coupons: [],
  supportTickets: [],
  auditLogs: [],
  notifications: [],
  pricingDefaults: null,
  userProfiles: [],
  paymentReceipts: []
};

import { saveDatabaseToR2 } from '../services/r2Storage.js';

let syncDebounceTimer = null;

/**
 * Persist in-memory database to Cloudflare R2 asynchronously.
 */
export function syncDbToR2() {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    saveDatabaseToR2(db).catch(err => console.error('R2 sync failed:', err.message));
  }, 300);
}



