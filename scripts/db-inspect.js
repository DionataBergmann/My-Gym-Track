
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('cwd:', process.cwd());
  console.log('DATABASE_URL:', process.env.DATABASE_URL || '(not set)');

  const files = await prisma.$queryRawUnsafe(`PRAGMA database_list`);
  console.log('SQLite files (PRAGMA database_list):', files);

  const users = await prisma.user.findMany({
    include: {
      plans: { select: { id: true, muscleGroup: true, name: true } },
    },
  });

  console.log('\nUsers:', users.length);
  for (const u of users) {
    console.log(`- phone=${u.phone} id=${u.id} plans=${u.plans.length}`);
    for (const p of u.plans) {
      console.log(`    ${p.muscleGroup} (${p.name})`);
    }
  }

  if (users.length === 0) {
    console.log('\n(No users — run: npm run seed)');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
