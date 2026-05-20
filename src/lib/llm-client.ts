import { ApiConfig } from './config-store'

export interface LLMResponse {
  content: string
  success: boolean
  error?: string
}

export async function callLLM(
  config: ApiConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<LLMResponse> {
  const payload = {
    model: config.model,
    max_tokens: maxTokens,
    messages: [
      { role: 'user', content: systemPrompt + '\n\n---\n\n' + userPrompt }
    ],
    stream: false,
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.content && data.content.length > 0) {
        return { content: data.content[0].text.trim(), success: true }
      }
      const errMsg = data.routify_response?.error_message || JSON.stringify(data).slice(0, 200)
      if (attempt === 2) return { content: '', success: false, error: errMsg }
    } catch (e: unknown) {
      if (attempt === 2) return { content: '', success: false, error: String(e) }
    }
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
  }
  return { content: '', success: false, error: 'Max retries reached' }
}

export async function testConnection(config: ApiConfig): Promise<{ ok: boolean; msg: string }> {
  const res = await callLLM(config, '', '回复OK即可', 10)
  if (res.success) return { ok: true, msg: `连接成功 - 模型: ${config.model}` }
  return { ok: false, msg: res.error || '连接失败' }
}
