import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let embeddingModel = null;

/**
 * Initialize the Gemini embedding service.
 * Uses text-embedding-004 (free tier: 1,500 RPD).
 */
export function initEmbeddings(apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
}

/** Generate a single embedding vector */
export async function generateEmbedding(text) {
  if (!embeddingModel) throw new Error('Embeddings service not initialized');

  const result = await embeddingModel.embedContent(text);
  return result.embedding.values; // Float64Array
}

/**
 * Generate embeddings for multiple texts.
 * Processes in batches of 5 with rate-limit delays.
 */
export async function generateEmbeddings(texts) {
  const embeddings = [];
  const batchSize = 5;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    embeddings.push(...batchResults);

    // Delay between batches to respect Gemini free-tier rate limits
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return embeddings;
}
