import { generateEmbedding } from './embeddings.js';
import { searchSimilar } from './vectorStore.js';
import db from '../database/db.js';

/**
 * Retrieve relevant document chunks for a user query.
 * Handles embedding generation, vector search, filtering, and metadata enrichment.
 */
export async function retrieveContext(query, options = {}) {
  const {
    topK = 5,
    documentIds = null,
    minSimilarity = 0.3,
  } = options;

  const startTime = Date.now();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Search vector store
  const results = searchSimilar(queryEmbedding, topK * 2, documentIds);

  // Filter out low-similarity noise
  const filteredResults = results
    .filter((r) => r.similarity >= minSimilarity)
    .slice(0, topK);

  // Enrich with document names
  const enrichedResults = filteredResults.map((result) => {
    const doc = db.get(
      'SELECT name, originalName FROM documents WHERE id = ?',
      result.documentId
    );

    return {
      ...result,
      documentName: doc?.originalName || doc?.name || 'Unknown',
    };
  });

  const responseTime = Date.now() - startTime;

  return {
    chunks: enrichedResults,
    query,
    responseTime,
    totalFound: results.length,
    filtered: enrichedResults.length,
  };
}

/**
 * Build a formatted context string from retrieved chunks
 * for injection into the LLM prompt.
 */
export function buildPromptContext(chunks) {
  if (chunks.length === 0) {
    return 'No relevant documents were found for this query.';
  }

  let context = 'Here are the relevant document excerpts:\n\n';

  chunks.forEach((chunk, i) => {
    context += `--- Source ${i + 1}: "${chunk.documentName}" (Relevance: ${(chunk.similarity * 100).toFixed(1)}%) ---\n`;
    context += chunk.content + '\n\n';
  });

  return context;
}
