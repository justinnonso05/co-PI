import { prisma } from '../db';

const BTL_BASE_URL = 'https://api.badtheorylabs.com/v1';

export interface BTLMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BTLCompletionOptions {
  repositoryId: string;
  userId?: string;
  messages: BTLMessage[];
  response_format?: { type: 'json_object' | 'text' };
  model?: string;
}

export class BtlRuntimeService {
  /**
   * Calls the BTL Runtime /chat/completions endpoint, logging the interaction.
   * This is used for standard (non-streaming) calls like Literature Digest or Dataset Review.
   */
  static async createChatCompletion(options: BTLCompletionOptions): Promise<any> {
    const apiKey = process.env.GATEWAY_API_KEY;
    if (!apiKey) {
      throw new Error('GATEWAY_API_KEY is missing from environment variables.');
    }

    const payload = {
      model: options.model || 'gpt-4o-mini',
      messages: options.messages,
      stream: false,
      ...(options.response_format ? { response_format: options.response_format } : {})
    };

    const response = await fetch(`${BTL_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Capture all BTL headers for the demo proof
    const headers = {
      'x-btl-request-id': response.headers.get('x-btl-request-id') || '',
      'x-btl-cache-tier': response.headers.get('x-btl-cache-tier') || '',
      'x-btl-saved': response.headers.get('x-btl-saved') || '',
      'x-gateway-savings': response.headers.get('x-gateway-savings') || '',
    };

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BTL API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Log the interaction asynchronously to prove cache hits in the hackathon demo
    prisma.aiInteraction.create({
      data: {
        repositoryId: options.repositoryId,
        userId: options.userId || null,
        prompt: JSON.stringify(payload.messages),
        response: JSON.stringify({
          body: data, // Critical: 'id' and 'created' from the body prove the cache reuse
          headers: headers,
        }),
        endpoint: '/v1/chat/completions',
      },
    }).catch((err) => console.error("Failed to log AiInteraction:", err));

    return data;
  }

  /**
   * Calls the BTL Runtime /chat/completions endpoint with stream: true.
   * Yields text chunks as they arrive.
   */
  static async *createChatCompletionStream(options: BTLCompletionOptions): AsyncGenerator<string, void, unknown> {
    const apiKey = process.env.GATEWAY_API_KEY;
    if (!apiKey) {
      throw new Error('GATEWAY_API_KEY is missing from environment variables.');
    }

    const payload = {
      model: options.model || 'gpt-4o-mini',
      messages: options.messages,
      stream: true,
    };

    const response = await fetch(`${BTL_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BTL API error: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body for stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the incomplete line in the buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // Skip empty lines and SSE comments

          if (trimmed === 'data: [DONE]') {
            return;
          }

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.choices && data.choices.length > 0) {
                const delta = data.choices[0].delta;
                if (delta && delta.content) {
                  yield delta.content;
                }
              }
            } catch (err) {
              console.error('Failed to parse SSE chunk:', dataStr, err);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
