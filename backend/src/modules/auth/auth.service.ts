import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../shared/utils/logger';
import type { LoginInput, RegisterInput } from './auth.schema';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  generateToken(
    fastify: FastifyInstance,
    payload: { id: string; accountId: string; email: string; role: string },
  ): string {
    return fastify.jwt.sign(payload, { expiresIn: env.JWT_EXPIRES_IN });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async login(
    fastify: FastifyInstance,
    input: LoginInput,
  ): Promise<{
    token: string;
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      accountId: string;
      account: { id: string; name: string; slug: string };
    };
  }> {
    const user = await prisma.user.findFirst({
      where: { email: input.email.toLowerCase() },
      include: {
        account: {
          select: { id: true, name: true, slug: true, status: true },
        },
        operator: {
          select: { id: true, branchId: true },
        },
      },
    });

    if (!user) {
      logger.warn({ email: input.email }, 'Login attempt: user not found');
      throw new Error('INVALID_CREDENTIALS');
    }

    if (user.status === 'INACTIVE') {
      throw new Error('USER_INACTIVE');
    }

    if (user.account.status === 'SUSPENDED' || user.account.status === 'CANCELLED') {
      throw new Error('ACCOUNT_SUSPENDED');
    }

    const valid = await this.comparePassword(input.password, user.passwordHash);
    if (!valid) {
      logger.warn({ email: input.email }, 'Login attempt: wrong password');
      throw new Error('INVALID_CREDENTIALS');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(fastify, {
      id: user.id,
      accountId: user.accountId,
      email: user.email,
      role: user.role.toLowerCase(),
    });

    logger.info({ userId: user.id, accountId: user.accountId }, 'User logged in');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.toLowerCase(),
        accountId: user.accountId,
        account: {
          id: user.account.id,
          name: user.account.name,
          slug: user.account.slug,
        },
        operatorId: user.operator?.id ?? null,
        branchId: user.operator?.branchId ?? null,
      },
    };
  }

  async register(
    fastify: FastifyInstance,
    input: RegisterInput,
  ): Promise<{
    token: string;
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      accountId: string;
      account: { id: string; name: string; slug: string };
    };
  }> {
    const email = input.email.toLowerCase();

    // Check if email already exists
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      throw new Error('EMAIL_TAKEN');
    }

    // Build a unique slug
    const baseSlug = input.accountSlug ?? this.slugify(input.accountName);
    let slug = baseSlug;
    let suffix = 0;
    while (await prisma.account.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    // Find cheapest active plan for trial
    const cheapestPlan = await prisma.plan.findFirst({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    const passwordHash = await this.hashPassword(input.password);
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { account, user } = await prisma.$transaction(async (tx) => {
      const newAccount = await tx.account.create({
        data: {
          name: input.accountName,
          slug,
          email,
          status: 'TRIALING',
          planId: cheapestPlan?.id ?? null,
        },
      });

      const newUser = await tx.user.create({
        data: {
          accountId: newAccount.id,
          email,
          passwordHash,
          fullName: input.fullName,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      if (cheapestPlan) {
        await tx.subscription.create({
          data: {
            accountId: newAccount.id,
            planId: cheapestPlan.id,
            status: 'TRIALING',
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            trialEnd,
          },
        });
      }

      return { account: newAccount, user: newUser };
    });

    const token = this.generateToken(fastify, {
      id: user.id,
      accountId: account.id,
      email: user.email,
      role: 'admin',
    });

    logger.info({ userId: user.id, accountId: account.id }, 'New account registered');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: 'admin',
        accountId: account.id,
        account: {
          id: account.id,
          name: account.name,
          slug: account.slug,
        },
      },
    };
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        account: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            phone: true,
            logoUrl: true,
            status: true,
            settings: true,
            plan: {
              select: {
                id: true,
                name: true,
                maxBranches: true,
                maxOperatorsPerBranch: true,
                maxServicesPerBranch: true,
                maxTicketsPerDay: true,
                features: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      ...user,
      role: user.role.toLowerCase(),
    };
  }
}

export const authService = new AuthService();
