import { prisma } from '../../config/database';

export const accountsService = {
  async getMyAccount(accountId: string) {
    return prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: {
        plan: true,
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { branches: true, users: true } },
      },
    });
  },

  async updateAccount(accountId: string, data: { name?: string; phone?: string; logoUrl?: string; settings?: object }) {
    return prisma.account.update({ where: { id: accountId }, data });
  },

  async getUsers(accountId: string) {
    return prisma.user.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, fullName: true, role: true, status: true, lastLoginAt: true, createdAt: true, operator: { select: { id: true, name: true } } },
    });
  },

  async createUser(accountId: string, data: { email: string; passwordHash: string; fullName: string; role: 'ADMIN' | 'MANAGER' | 'OPERATOR' }) {
    const existing = await prisma.user.findFirst({ where: { accountId, email: data.email } });
    if (existing) throw new Error('EMAIL_TAKEN');
    return prisma.user.create({
      data: { accountId, ...data },
      select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
    });
  },

  async updateUser(userId: string, accountId: string, data: { fullName?: string; role?: 'ADMIN' | 'MANAGER' | 'OPERATOR'; status?: 'ACTIVE' | 'INACTIVE' }) {
    const user = await prisma.user.findFirst({ where: { id: userId, accountId } });
    if (!user) throw new Error('USER_NOT_FOUND');
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });
  },

  async deleteUser(userId: string, accountId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, accountId } });
    if (!user) throw new Error('USER_NOT_FOUND');
    await prisma.user.update({ where: { id: userId }, data: { status: 'INACTIVE' } });
  },

  async getPlans() {
    return prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  },
};
