import { parseSseBuffer, sseRequest, SseRequestError } from './sseRequest';

declare const global: any;

function sseResponse(chunks: string[], contentType = 'text/event-stream') {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
        return;
      }
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
    body: stream,
    text: async () => chunks.join(''),
    json: async () => JSON.parse(chunks.join('') || '{}'),
  };
}

describe('parseSseBuffer', () => {
  it('parses frames split across chunks and ignores pings', () => {
    const first = parseSseBuffer('event: progress\ndata: {"done":1');
    expect(first.frames).toEqual([]);
    const second = parseSseBuffer(`${first.rest},"total":2}\n\n: ping\n\nevent: result\ndata: {"ok":true}\n\n`);
    expect(second.frames).toEqual([
      { event: 'progress', data: '{"done":1,"total":2}' },
      { event: 'result', data: '{"ok":true}' },
    ]);
  });
});

describe('sseRequest', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.CONFIG = { BASEPATH: 'http://localhost:8037' };
    window.localStorage.setItem('jwt', 'token-1');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
  });

  it('sends JWT, Accept, and POST JSON body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse([
      'event: result\ndata: {"insertCount":1}\n\n',
    ]));

    await sseRequest('/event-subscriptions/populate-missing', { topic: 't' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8037/event-subscriptions/populate-missing',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-1',
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: 't' }),
      })
    );
  });

  it('invokes onProgress and resolves with result', async () => {
    const onProgress = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse([
      'event: progress\ndata: {"done":1,"total":2}\n\n',
      'event: result\ndata: {"insertCount":2}\n\n',
    ]));

    const result = await sseRequest('/x', {}, { onProgress });
    expect(onProgress).toHaveBeenCalledWith({ done: 1, total: 2 });
    expect(result).toEqual({ insertCount: 2 });
  });

  it('resolves on result even if the stream never closes', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: result\ndata: {"ok":true}\n\n'));
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });

    await expect(sseRequest('/x', {})).resolves.toEqual({ ok: true });
  });

  it('treats JSON content-type as a completed result', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse(['{"legacy":true}'], 'application/json'));
    const result = await sseRequest('/x', {});
    expect(result).toEqual({ legacy: true });
  });

  it('rejects on error event', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse([
      'event: error\ndata: {"message":"boom"}\n\n',
    ]));
    await expect(sseRequest('/x', {})).rejects.toEqual(expect.objectContaining({
      name: 'SseRequestError',
      message: 'boom',
    }));
  });

  it('rejects on non-OK HTTP', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'text/event-stream' },
      body: null,
    });
    await expect(sseRequest('/x', {})).rejects.toBeInstanceOf(SseRequestError);
  });

  it('aborts the fetch when the signal aborts', async () => {
    const controller = new AbortController();
    (global.fetch as jest.Mock).mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const pending = sseRequest('/x', {}, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toEqual(expect.objectContaining({ name: 'AbortError' }));
  });
});
