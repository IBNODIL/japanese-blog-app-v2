const { PrismaClient } = require('./app/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const verification = await prisma.verification.findFirst({
      where: { identifier: 'reset_resettest@test.com' },
      orderBy: { expiresAt: 'desc' }
    });
    
    if (verification) {
      console.log('Reset code:', verification.value);
      console.log('Expires at:', verification.expiresAt);
    } else {
      console.log('No verification code found');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
