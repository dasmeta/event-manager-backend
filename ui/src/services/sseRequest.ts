export type SseProgress = {
  done?: number;
  total?: number;
  label?: string;
};

export class SseRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SseRequestError';
  }
}

type ParsedFrame = { event: string; data: string };

export function parseSseBuffer(buffer: string): { frames: ParsedFrame[]; rest: string } {
  const frames: ParsedFrame[] = [];
  let rest = buffer.replace(/\r\n/g, '\n');

  while (true) {
    const split = rest.indexOf('\n\n');
    if (split === -1) {
      break;
    }
    const block = rest.slice(0, split);
    rest = rest.slice(split + 2);

    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) {
        continue;
      }
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length) {
      frames.push({ event, data: dataLines.join('\n') });
    }
  }

  return { frames, rest };
}

export async function sseRequest<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  options?: {
    onProgress?: (progress: SseProgress) => void;
    signal?: AbortSignal;
  }
): Promise<T> {
  const jwt = window.localStorage.getItem('jwt');
  const response = await fetch(`${CONFIG.BASEPATH}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new SseRequestError(`Request failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    if (!response.body) {
      return {} as T;
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  if (!response.body) {
    return {} as T;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.rest;
    for (const frame of parsed.frames) {
      if (frame.event === 'progress' && options?.onProgress) {
        options.onProgress(JSON.parse(frame.data));
      } else if (frame.event === 'result') {
        reader.cancel().catch(() => {
          // stream may already be closing
        });
        return JSON.parse(frame.data) as T;
      } else if (frame.event === 'error') {
        reader.cancel().catch(() => {
          // stream may already be closing
        });
        const payload = JSON.parse(frame.data);
        throw new SseRequestError(payload.message || 'Unexpected error');
      }
    }
  }

  return {} as T;
}
