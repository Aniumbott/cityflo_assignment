import prisma from './src/lib/prisma';

async function checkFailed() {
  const invoices = await prisma.invoice.findMany({
    where: { extractionStatus: 'FAILED' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('Failed invoices:', invoices.length);
  console.log(JSON.stringify(invoices, null, 2));

  const processing = await prisma.invoice.findMany({
    where: { extractionStatus: 'PROCESSING' },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\nProcessing invoices:', processing.length);
  console.log(JSON.stringify(processing, null, 2));

  await prisma.$disconnect();
}

checkFailed();
