import fs from 'fs/promises';
import path from 'path';

/**
 * Parse a document and extract raw text content.
 * Supports PDF, DOCX, TXT, and MD files.
 */
export async function parseDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return await parsePDF(filePath);
    case '.docx':
      return await parseDOCX(filePath);
    case '.txt':
    case '.md':
      return await parseTXT(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/** Extract text from PDF using pdf-parse */
async function parsePDF(filePath) {
  // Dynamic import because pdf-parse uses CJS internally
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);

  return {
    text: data.text,
    metadata: {
      pages: data.numpages,
      title: data.info?.Title || null,
      author: data.info?.Author || null,
    },
  };
}

/** Extract text from DOCX using mammoth */
async function parseDOCX(filePath) {
  const mammoth = await import('mammoth');
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: result.value,
    metadata: {
      warnings: result.messages.filter((m) => m.type === 'warning').length,
    },
  };
}

/** Read plain text / markdown files */
async function parseTXT(filePath) {
  const text = await fs.readFile(filePath, 'utf-8');
  return {
    text,
    metadata: {},
  };
}
