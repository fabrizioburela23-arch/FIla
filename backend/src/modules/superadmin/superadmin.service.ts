import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const superadminService = {
  /** Global stats across all accounts */
  async getStats() {
    const [totalAccounts, totalUsers, totalTicketsToday, activeAccounts] = await Promise.all([
      prisma.account.count(),
      prisma.user.count({ where: { role: { not: 'SUPERADMIN' } } }),
      prisma.ticket.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.account.count({ where: { status: { in: ['ACTIVE', 'TRIALING'] } } }),
    ]);
    return { totalAccounts, activeAccounts, totalUsers, totalTicketsToday };
  },

  /** List all accounts with aggregate info */
  async listAccounts() {
    return prisma.account.findMany({
      include: {
        plan: { select: { id: true, name: true } },
        _count: { select: { users: true, branches: true, operators: true, tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Get single account */
  async getAccount(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        plan: { select: { id: true, name: true } },
        _count: { select: { users: true, branches: true, operators: true, tickets: true } },
      },
    });
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');
    return account;
  },

  /** Create new account + admin user */
  async createAccount(data: {
    accountName: string;
    accountEmail: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    planId?: string;
  }) {
    // Check email uniqueness
    const existingAccount = await prisma.account.findFirst({ where: { email: data.accountEmail } });
    if (existingAccount) throw new Error('ACCOUNT_EMAIL_TAKEN');

    const existingUser = await prisma.user.findFirst({ where: { email: data.adminEmail } });
    if (existingUser) throw new Error('USER_EMAIL_TAKEN');

    // Build unique slug
    const baseSlug = slugify(data.accountName);
    let slug = baseSlug;
    let suffix = 0;
    while (await prisma.account.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const planId = data.planId
      ? data.planId
      : (await prisma.plan.findFirst({ where: { isActive: true }, orderBy: { price: 'asc' } }))?.id ?? null;

    const passwordHash = await bcrypt.hash(data.adminPassword, 12);

    return prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: { name: data.accountName, slug, email: data.accountEmail, status: 'ACTIVE', planId },
      });
      const user = await tx.user.create({
        data: {
          accountId: account.id,
          email: data.adminEmail,
          passwordHash,
          fullName: data.adminName,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        select: { id: true, email: true, fullName: true, role: true },
      });
      return { account, adminUser: user };
    });
  },

  /** Suspend or activate an account */
  async setAccountStatus(accountId: string, status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');
    return prisma.account.update({ where: { id: accountId }, data: { status } });
  },

  /** List users of any account */
  async getAccountUsers(accountId: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');
    return prisma.user.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, email: true, fullName: true, role: true,
        status: true, lastLoginAt: true, createdAt: true,
        operator: { select: { id: true, name: true, branchId: true } },
      },
    });
  },

  /** Create user in any account */
  async createAccountUser(
    accountId: string,
    data: { email: string; password: string; fullName: string; role: 'ADMIN' | 'MANAGER' | 'OPERATOR' },
  ) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');

    const existing = await prisma.user.findFirst({ where: { accountId, email: data.email } });
    if (existing) throw new Error('EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(data.password, 12);
    return prisma.user.create({
      data: { accountId, email: data.email, passwordHash, fullName: data.fullName, role: data.role },
      select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
    });
  },
};
