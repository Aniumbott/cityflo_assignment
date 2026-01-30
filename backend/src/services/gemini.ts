import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { config } from '../config';
import { ExtractionResult } from '../types';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const EXTRACTION_PROMPT = `You are an invoice data extraction system. Analyze the provided PDF invoice and extract all structured data.

Return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):

{
  "vendorName": "string or null",
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD string or null",
  "dueDate": "YYYY-MM-DD string or null",
  "lineItems": [
    {
      "description": "string or null",
      "quantity": number or null,
      "unitPrice": number or null,
      "total": number or null
    }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "grandTotal": number or null,
  "paymentTerms": "string or null",
  "bankDetails": "string or null",
  "confidenceScores": {
    "vendorName": 0.0-1.0,
    "invoiceNumber": 0.0-1.0,
    "invoiceDate": 0.0-1.0,
    "dueDate": 0.0-1.0,
    "lineItems": 0.0-1.0,
    "subtotal": 0.0-1.0,
    "tax": 0.0-1.0,
    "grandTotal": 0.0-1.0,
    "paymentTerms": 0.0-1.0,
    "bankDetails": 0.0-1.0
  }
}

Rules:
- Confidence scores: 1.0 = clearly visible and unambiguous, 0.5-0.9 = partially visible or inferred, 0.0-0.4 = not found or guessed
- Dates must be in YYYY-MM-DD format
- Monetary values must be plain numbers (no currency symbols)
- If a field is not found in the invoice, set it to null and give confidence 0.0
- Return ONLY the JSON object, no other text`;

export async function extractInvoiceData(filePath: string): Promise<ExtractionResult> {
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64Data,
      },
    },
    { text: EXTRACTION_PROMPT },
  ]);

  const responseText = result.response.text();

  // Strip markdown code fences if present
  const cleaned = responseText
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as ExtractionResult;

  // Validate required structure
  if (!parsed.confidenceScores || typeof parsed.confidenceScores !== 'object') {
    parsed.confidenceScores = {};
  }

  if (!Array.isArray(parsed.lineItems)) {
    parsed.lineItems = [];
  }

  return parsed;
}
