import prisma from './src/lib/prisma';

async function checkCompleted() {
  const completed = await prisma.invoice.findMany({
    where: { extractionStatus: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Completed invoices: ${completed.length}`);
  console.log(JSON.stringify(completed.map(inv => ({
    filename: inv.originalFilename,
    status: inv.extractionStatus,
    createdAt: inv.createdAt
  })), null, 2));

  await prisma.$disconnect();
}

checkCompleted();
