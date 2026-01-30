import { PrismaClient, UserRole } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

const seedUsers = [
  {
    email: 'employee1@cityflo.com',
    username: 'employee1',
    password: 'password123',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'employee2@cityflo.com',
    username: 'employee2',
    password: 'password123',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'accounts1@cityflo.com',
    username: 'accounts1',
    password: 'password123',
    role: UserRole.ACCOUNTS,
  },
  {
    email: 'senior.accounts@cityflo.com',
    username: 'senior_accounts1',
    password: 'password123',
    role: UserRole.SENIOR_ACCOUNTS,
  },
];

async function main() {
  console.log('Seeding database...');

  for (const user of seedUsers) {
    const passwordHash = await bcryptjs.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        email: user.email,
        username: user.username,
        passwordHash,
        role: user.role,
      },
    });
    console.log(`  Created user: ${user.username} (${user.role})`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
