import prisma from './src/lib/prisma';
import { processInvoiceExtraction } from './src/services/extraction';

async function retryFailedExtractions() {
  console.log('Finding failed invoices...\n');

  const failedInvoices = await prisma.invoice.findMany({
    where: { extractionStatus: 'FAILED' },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${failedInvoices.length} failed invoices\n`);

  for (const invoice of failedInvoices) {
    console.log(`Retrying: ${invoice.originalFilename} (${invoice.id})`);

    try {
      // Use the existing extraction service
      await processInvoiceExtraction(invoice.id);
      console.log(`✓ Successfully processed ${invoice.originalFilename}\n`);
    } catch (error) {
      console.error(`✗ Failed to process ${invoice.originalFilename}:`, error);
      console.log('');
    }
  }

  console.log('All retries complete!');
  await prisma.$disconnect();
}

retryFailedExtractions().catch(console.error);
