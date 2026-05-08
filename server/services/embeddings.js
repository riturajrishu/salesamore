import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';

let genAI = null;
let embeddingModel = null;
let hf = null;

export function initEmbeddings(geminiKey, hfToken) {
  if (geminiKey && !geminiKey.includes('your_')) {
    try {
      genAI = new GoogleGenerativeAI(geminiKey);
      embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    } catch {
      console.warn('⚠️ Gemini embeddings init failed.');
    }
  }
  
  if (hfToken && !hfToken.includes('your_')) {
    hf = new HfInference(hfToken);
  } else {
    // HuggingFace Inference API can often work (with strict rate limits) without a token
    hf = new HfInference();
  }
}

async function getGeminiEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function getHfEmbedding(text) {
  const result = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: text,
  });
  return result;
}

export async function generateEmbedding(text) {
  if (embeddingModel) {
    try {
      return await getGeminiEmbedding(text);
    } catch (err) {
      console.warn(`[Embeddings] Gemini failed (${err.message}). Falling back to HuggingFace...`);
    }
  }

  if (hf) {
    return await getHfEmbedding(text);
  }

  throw new Error('All embedding providers failed or none are configured.');
}

export async function generateEmbeddings(texts) {
  const embeddings = [];
  
  // Try Gemini first as primary if available
  if (embeddingModel) {
    try {
      const batchSize = 5;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((text) => getGeminiEmbedding(text))
        );
        embeddings.push(...batchResults);

        if (i + batchSize < texts.length) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      return embeddings;
    } catch (err) {
      console.warn(`[Embeddings] Gemini failed (${err.message}). Falling back to HuggingFace...`);
      // Clear array to start fresh with fallback
      embeddings.length = 0;
    }
  }

  // Fallback to HuggingFace
  if (hf) {
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await hf.featureExtraction({
         model: 'sentence-transformers/all-MiniLM-L6-v2',
         inputs: batch,
      });
      embeddings.push(...batchResults);

      if (i + batchSize < texts.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    return embeddings;
  }

  throw new Error('All embedding providers failed or none are configured.');
}
