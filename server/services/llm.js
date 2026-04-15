import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let model = null;

/**
 * Initialize the Gemini LLM service.
 * Uses gemini-2.0-flash (free tier: 15 RPM, 1M TPM).
 */
export function initLLM(apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.3,
      topP: 0.85,
      maxOutputTokens: 2048,
    },
  });
}

const SYSTEM_PROMPT = `You are NeuralDocs AI — an enterprise document intelligence assistant. Your role is to answer questions based EXCLUSIVELY on the provided document context.

RULES:
1. Answer ONLY from the provided document context. If the context doesn't contain enough information, say so clearly.
2. When referencing information, cite the source using [Source N] notation matching the source numbers provided.
3. Be precise, professional, and thorough.
4. Format your responses using markdown for readability (headers, bullet points, bold text, tables where appropriate).
5. If the user's question is ambiguous, ask for clarification.
6. Never make up or hallucinate information that isn't in the provided context.
7. If no relevant context is found, say: "I couldn't find relevant information in the uploaded documents. Please try rephrasing your question or upload additional documents."`;

/**
 * Stream an AI response using Gemini chat with RAG context.
 * Yields text chunks as they arrive from the model.
 */
export async function* streamResponse(query, context, chatHistory = []) {
  if (!model) throw new Error('LLM not initialized');

  // Build conversation history for multi-turn context
  const history = [
    {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }],
    },
    {
      role: 'model',
      parts: [
        {
          text: 'Understood. I will answer questions based exclusively on the provided document context, cite sources using [Source N] notation, and never fabricate information.',
        },
      ],
    },
  ];

  // Append recent chat history (last 6 messages for context window management)
  const recentHistory = chatHistory.slice(-6);
  for (const msg of recentHistory) {
    history.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  const userMessage = `Context from documents:\n${context}\n\n---\n\nUser question: ${query}`;

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(userMessage);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

/**
 * Generate a short title for a chat session
 * based on the first question asked.
 */
export async function generateTitle(query) {
  if (!model) return query.slice(0, 50);

  try {
    const result = await model.generateContent(
      `Generate a very short title (max 5 words) for a conversation that starts with this question: "${query}". Return ONLY the title text, no quotes or formatting.`
    );
    return result.response.text().trim().slice(0, 60);
  } catch {
    return query.slice(0, 50);
  }
}
