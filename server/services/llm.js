import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

let geminiModel = null;
let groq = null;
let groqModelName = 'llama-3.1-8b-instant'; // Updated from deprecated model

export function initLLM(geminiKey, groqKey) {
  if (geminiKey && !geminiKey.includes('your_')) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      geminiModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.3,
          topP: 0.85,
          maxOutputTokens: 2048,
        },
      });
    } catch {
      console.warn('⚠️ Gemini LLM init failed.');
    }
  }

  if (groqKey && !groqKey.includes('your_')) {
    groq = new Groq({ apiKey: groqKey });
  }
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

export async function* streamResponse(query, context, chatHistory = []) {
  if (!geminiModel && !groq) throw new Error('No LLM providers initialized');

  // Build shared history logic
  const recentHistory = chatHistory.slice(-6);
  
  // Try Gemini first
  if (geminiModel) {
    try {
      const history = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will follow rules.' }] },
      ];
      
      for (const msg of recentHistory) {
        history.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }

      const userMessage = `Context from documents:\n${context}\n\n---\n\nUser question: ${query}`;
      const chat = geminiModel.startChat({ history });
      const result = await chat.sendMessageStream(userMessage);

      // Successfully connected to stream!
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
      return; // Exit if Gemini succeeds
    } catch (err) {
      console.warn(`[LLM] Gemini failed (${err.message}). Falling back to Groq...`);
    }
  }

  // Fallback to Groq
  if (groq) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'assistant', content: 'Understood. I will follow rules.' },
    ];

    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    messages.push({
      role: 'user',
      content: `Context from documents:\n${context}\n\n---\n\nUser question: ${query}`,
    });

    const stream = await groq.chat.completions.create({
      messages,
      model: groqModelName,
      temperature: 0.3,
      top_p: 0.85,
      max_tokens: 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) yield text;
    }
    return;
  }

  throw new Error('All LLM providers failed.');
}

export async function generateTitle(query) {
  if (geminiModel) {
    try {
      const result = await geminiModel.generateContent(
        `Generate a very short title (max 5 words) for a conversation that starts with this question: "${query}". Return ONLY the title text.`
      );
      return result.response.text().trim().replace(/["']/g, "").slice(0, 60);
    } catch (err) {
      console.warn(`[Title] Gemini failed (${err.message}). Falling back to Groq...`);
    }
  }

  if (groq) {
    try {
      const result = await groq.chat.completions.create({
        messages: [{ role: 'user', content: `Generate a very short title (max 5 words) for a conversation that starts with this question: "${query}". Return ONLY the title text.` }],
        model: groqModelName,
        max_tokens: 10,
      });
      return result.choices[0]?.message?.content.trim().replace(/["']/g, "").slice(0, 60);
    } catch {
      return query.slice(0, 50);
    }
  }

  return query.slice(0, 50);
}
