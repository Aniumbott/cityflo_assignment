import { extractInvoiceData } from './src/services/gemini';
import path from 'path';
import { config } from './src/config';

async function testExtraction() {
  try {
    const filePath = path.resolve(config.uploadDir, '1769843025001-823443221.pdf');
    console.log('Testing extraction on:', filePath);
    console.log('Upload dir:', config.uploadDir);
    console.log('Gemini API Key length:', config.geminiApiKey?.length || 0);

    const result = await extractInvoiceData(filePath);
    console.log('Extraction successful!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Extraction failed:');
    console.error(error);
  }
}

testExtraction();
