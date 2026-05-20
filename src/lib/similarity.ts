/**
 * TF-IDF + 余弦相似度（纯前端实现，支持中文）
 */

// 简单中文分词（按字符 bigram + 单字，不依赖 jieba）
function tokenize(text: string): string[] {
  // 去除标点符号和数字
  const cleaned = text.replace(/[a-zA-Z0-9\s\n\r\t。，、；：？！""''（）【】《》\-—…·．.,;:!?()\"'\\/_\[\]{}|<>@#$%^&*+=~`]/g, '')
  const tokens: string[] = []
  for (let i = 0; i < cleaned.length - 1; i++) {
    tokens.push(cleaned.slice(i, i + 2))
  }
  return tokens.filter(t => t.trim().length === 2)
}

interface TfidfVector {
  [term: string]: number
}

function buildTfidf(docs: string[][]): TfidfVector[] {
  const N = docs.length
  // document frequency
  const df: Record<string, number> = {}
  for (const doc of docs) {
    const seen = new Set(doc)
    for (const term of seen) {
      df[term] = (df[term] || 0) + 1
    }
  }

  // TF-IDF vectors
  return docs.map(doc => {
    const tf: Record<string, number> = {}
    for (const term of doc) {
      tf[term] = (tf[term] || 0) + 1
    }
    const vec: TfidfVector = {}
    for (const [term, count] of Object.entries(tf)) {
      if (df[term] && df[term] < N * 0.95) { // skip terms in >95% docs
        vec[term] = (count / doc.length) * Math.log(N / df[term])
      }
    }
    return vec
  })
}

function cosineSim(a: TfidfVector, b: TfidfVector): number {
  let dot = 0, normA = 0, normB = 0
  for (const k of Object.keys(a)) {
    normA += a[k] * a[k]
    if (b[k]) dot += a[k] * b[k]
  }
  for (const k of Object.keys(b)) {
    normB += b[k] * b[k]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export interface SimilarityPair {
  idxA: number
  idxB: number
  sheetA: string
  sheetB: string
  titleA: string
  titleB: string
  similarity: number
}

export interface SimilarityResult {
  pairs: SimilarityPair[]
  totalDocs: number
}

export function computeSimilarity(
  items: { sheet: string; title: string; text: string }[],
  threshold = 0.3
): SimilarityResult {
  const tokenized = items.map(item => tokenize(item.text))
  const vectors = buildTfidf(tokenized)
  const pairs: SimilarityPair[] = []

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const sim = cosineSim(vectors[i], vectors[j])
      if (sim >= threshold) {
        pairs.push({
          idxA: i,
          idxB: j,
          sheetA: items[i].sheet,
          sheetB: items[j].sheet,
          titleA: items[i].title.slice(0, 80),
          titleB: items[j].title.slice(0, 80),
          similarity: Math.round(sim * 1000) / 1000,
        })
      }
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity)
  return { pairs, totalDocs: items.length }
}
