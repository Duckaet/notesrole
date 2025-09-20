import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // Create tenants
    console.log('Creating tenants...');
    const acmeTenant = await prisma.tenant.upsert({
      where: { slug: 'acme' },
      update: {},
      create: {
        slug: 'acme',
        name: 'Acme Corp',
        plan: 'FREE',
      },
    });
    console.log(`✅ Created tenant: ${acmeTenant.name} (${acmeTenant.slug})`);

    const globexTenant = await prisma.tenant.upsert({
      where: { slug: 'globex' },
      update: {},
      create: {
        slug: 'globex',
        name: 'Globex Industries',
        plan: 'FREE',
      },
    });
    console.log(`✅ Created tenant: ${globexTenant.name} (${globexTenant.slug})`);

    // Hash password for all test accounts (password: "password")
    console.log('Hashing passwords...');
    const hashedPassword = await bcrypt.hash('password', 12);
    console.log('✅ Password hashed');

    // Create users for Acme
    console.log('Creating Acme users...');
    const acmeAdmin = await prisma.user.upsert({
      where: { 
        email_tenantId: {
          email: 'admin@acme.test',
          tenantId: acmeTenant.id
        }
      },
      update: {},
      create: {
        email: 'admin@acme.test',
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: acmeTenant.id,
      },
    });
    console.log(`✅ Created user: ${acmeAdmin.email} (${acmeAdmin.role})`);

    const acmeUser = await prisma.user.upsert({
      where: { 
        email_tenantId: {
          email: 'user@acme.test',
          tenantId: acmeTenant.id
        }
      },
      update: {},
      create: {
        email: 'user@acme.test',
        password: hashedPassword,
        role: 'MEMBER',
        tenantId: acmeTenant.id,
      },
    });
    console.log(`✅ Created user: ${acmeUser.email} (${acmeUser.role})`);

    // Create users for Globex
    console.log('Creating Globex users...');
    const globexAdmin = await prisma.user.upsert({
      where: { 
        email_tenantId: {
          email: 'admin@globex.test',
          tenantId: globexTenant.id
        }
      },
      update: {},
      create: {
        email: 'admin@globex.test',
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: globexTenant.id,
      },
    });
    console.log(`✅ Created user: ${globexAdmin.email} (${globexAdmin.role})`);

    const globexUser = await prisma.user.upsert({
      where: { 
        email_tenantId: {
          email: 'user@globex.test',
          tenantId: globexTenant.id
        }
      },
      update: {},
      create: {
        email: 'user@globex.test',
        password: hashedPassword,
        role: 'MEMBER',
        tenantId: globexTenant.id,
      },
    });
    console.log(`✅ Created user: ${globexUser.email} (${globexUser.role})`);

    // Create sample notes for Acme
    console.log('Creating sample notes for Acme...');
    await prisma.note.create({
      data: {
        title: 'Welcome to Acme Notes',
        content: 'This is your first note in the Acme tenant. You can create, edit, and delete notes here.',
        authorId: acmeUser.id,
        tenantId: acmeTenant.id,
      },
    });

    await prisma.note.create({
      data: {
        title: 'Admin Note',
        content: 'This note was created by an admin user.',
        authorId: acmeAdmin.id,
        tenantId: acmeTenant.id,
      },
    });

    // Create sample notes for Globex
    console.log('Creating sample notes for Globex...');
    await prisma.note.create({
      data: {
        title: 'Welcome to Globex Notes',
        content: 'This is your first note in the Globex tenant. Data is completely isolated from other tenants.',
        authorId: globexUser.id,
        tenantId: globexTenant.id,
      },
    });

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • 2 tenants created (Acme, Globex)`);
    console.log(`   • 4 users created (2 per tenant)`);
    console.log(`   • 3 sample notes created`);
    console.log(`   • All users have password: "password"`);
    console.log('\n🔑 Test Accounts:');
    console.log('   Acme Admin: admin@acme.test / password');
    console.log('   Acme User:  user@acme.test / password');
    console.log('   Globex Admin: admin@globex.test / password');
    console.log('   Globex User:  user@globex.test / password');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });