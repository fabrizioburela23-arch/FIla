import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Fórmula de precio: precio_venta = costo / (1 - margen)
// Precios en BOB (Bolivianos)
const plans = [
  {
    name: 'Starter',
    description: 'Para negocios pequeños que dan sus primeros pasos con filas digitales',
    cost: 122.50,      // BOB/mes — costo operativo
    margin: 0.65,      // 65% margen sobre precio de venta
    price: 350.00,     // 122.50 / (1 - 0.65) = 350 BOB/mes ≈ $50 USD
    maxBranches: 1,
    maxOperatorsPerBranch: 3,
    maxServicesPerBranch: 3,
    maxTicketsPerDay: 200,
    features: { analytics_basic: true, qr_generator: true, tv_display: false, webhooks: false },
  },
  {
    name: 'Business',
    description: 'Para clínicas, farmacias y empresas con múltiples sucursales',
    cost: 367.50,
    margin: 0.65,
    price: 1050.00,    // 367.50 / (1 - 0.65) = 1050 BOB/mes ≈ $150 USD
    maxBranches: 5,
    maxOperatorsPerBranch: 10,
    maxServicesPerBranch: 10,
    maxTicketsPerDay: 2000,
    features: { analytics_advanced: true, qr_generator: true, tv_display: true, webhooks: true, transfer: true },
  },
  {
    name: 'Enterprise',
    description: 'Para bancos, hospitales y corporativos de alto volumen',
    cost: 980.00,
    margin: 0.65,
    price: 2800.00,    // 980 / (1 - 0.65) = 2800 BOB/mes ≈ $400 USD
    maxBranches: 999,
    maxOperatorsPerBranch: 999,
    maxServicesPerBranch: 999,
    maxTicketsPerDay: 999999,
    features: { analytics_advanced: true, qr_generator: true, tv_display: true, webhooks: true, transfer: true, api_access: true, white_label: true, priority_support: true },
  },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Upsert plans (find by name first, then create or update)
  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    if (existing) {
      await prisma.plan.update({ where: { id: existing.id }, data: plan });
    } else {
      await prisma.plan.create({ data: plan });
    }
  }
  console.log('✅ Plans seeded (BOB pricing)');

  // Demo account (runs on first deploy in any environment)
  if (true) {
    const existingAccount = await prisma.account.findUnique({ where: { email: 'demo@fila.bo' } });
    if (!existingAccount) {
      const starterPlan = await prisma.plan.findFirst({ where: { name: 'Business' } });

      const account = await prisma.account.create({
        data: {
          name: 'Clínica Demo Bolivia',
          slug: 'clinica-demo',
          email: 'demo@fila.bo',
          phone: '+591 2 2000000',
          status: 'ACTIVE',
          planId: starterPlan?.id,
        },
      });

      const passwordHash = await bcrypt.hash('demo1234', 12);
      const adminUser = await prisma.user.create({
        data: {
          accountId: account.id,
          email: 'admin@fila.bo',
          passwordHash,
          fullName: 'Administrador Demo',
          role: 'ADMIN',
        },
      });

      const branch = await prisma.branch.create({
        data: {
          accountId: account.id,
          name: 'Sucursal Central La Paz',
          address: 'Av. 16 de Julio, El Prado',
          city: 'La Paz',
          country: 'BO',
          timezone: 'America/La_Paz',
          isOpen: true,
        },
      });

      const services = await prisma.$transaction([
        prisma.service.create({
          data: { branchId: branch.id, accountId: account.id, name: 'Consulta Médica', prefix: 'C', color: '#3B82F6', avgAttentionSecs: 720, position: 0 },
        }),
        prisma.service.create({
          data: { branchId: branch.id, accountId: account.id, name: 'Farmacia', prefix: 'F', color: '#10B981', avgAttentionSecs: 180, position: 1 },
        }),
        prisma.service.create({
          data: { branchId: branch.id, accountId: account.id, name: 'Laboratorio', prefix: 'L', color: '#F59E0B', avgAttentionSecs: 300, position: 2 },
        }),
      ]);

      const operatorUser = await prisma.user.create({
        data: {
          accountId: account.id,
          email: 'operador@fila.bo',
          passwordHash: await bcrypt.hash('demo1234', 12),
          fullName: 'Carlos Mamani',
          role: 'OPERATOR',
        },
      });

      await prisma.operator.create({
        data: {
          branchId: branch.id,
          accountId: account.id,
          userId: operatorUser.id,
          name: 'Ventanilla 1',
          displayName: 'V1',
          status: 'ONLINE',
          serviceIds: [services[0].id, services[1].id],
        },
      });

      await prisma.operator.create({
        data: {
          branchId: branch.id,
          accountId: account.id,
          name: 'Ventanilla 2',
          displayName: 'V2',
          status: 'ONLINE',
          serviceIds: [services[1].id, services[2].id],
        },
      });

      if (starterPlan) {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + 14);
        await prisma.subscription.create({
          data: {
            accountId: account.id,
            planId: starterPlan.id,
            status: 'TRIALING',
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            trialEnd,
          },
        });
      }

      console.log('✅ Demo account seeded');
      console.log('   Email admin: admin@fila.bo / demo1234');
      console.log('   Email operador: operador@fila.bo / demo1234');
    }
  }

  console.log('🎉 Seed complete');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
