/**
 * Recursive text splitter that respects semantic boundaries.
 * Splits on paragraphs → sentences → words, with configurable overlap.
 */
export function chunkText(text, options = {}) {
  const {
    chunkSize = 500,
    chunkOverlap = 50,
    separators = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' '],
  } = options;

  if (!text || text.trim().length === 0) return [];

  // Clean up the text — normalize whitespace
  const cleaned = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

  const rawChunks = recursiveSplit(cleaned, separators, chunkSize, chunkOverlap);

  // Build chunk objects with metadata
  return rawChunks
    .map((chunk, index) => ({
      content: chunk.trim(),
      chunkIndex: index,
      metadata: {
        charLength: chunk.trim().length,
      },
    }))
    .filter((c) => c.content.length > 30); // Filter out trivially small chunks
}

function recursiveSplit(text, separators, chunkSize, chunkOverlap) {
  if (text.length <= chunkSize) return [text];

  // Find the best separator that exists in the text
  let bestSep = '';
  for (const sep of separators) {
    if (text.includes(sep)) {
      bestSep = sep;
      break;
    }
  }

  // No separator found — hard split by character count
  if (!bestSep) {
    return splitBySize(text, chunkSize, chunkOverlap);
  }

  const parts = text.split(bestSep);
  const chunks = [];
  let currentChunk = '';

  for (const part of parts) {
    const testChunk = currentChunk
      ? currentChunk + bestSep + part
      : part;

    if (testChunk.length > chunkSize && currentChunk) {
      chunks.push(currentChunk);
      // Carry overlap from end of previous chunk
      const overlap = getOverlapText(currentChunk, chunkOverlap);
      currentChunk = overlap + part;
    } else {
      currentChunk = testChunk;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function splitBySize(text, chunkSize, chunkOverlap) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - chunkOverlap;
    if (start >= text.length - chunkOverlap) break;
  }

  return chunks;
}

function getOverlapText(text, overlapSize) {
  if (text.length <= overlapSize) return text;
  return text.slice(-overlapSize);
}
