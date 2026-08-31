import { prisma } from '@/lib/prisma';

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
