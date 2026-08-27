import { useCallback, useEffect, useRef, useState } from 'react';
import { Progress, message, notification } from 'antd';
import translations from '@/assets/translations';
import { sseRequest, SseProgress } from '@/services/sseRequest';
import { subscribeLeaveSiteWarning } from '@/utils/leaveSiteWarning';

type RunOptions = {
  title?: string;
  onProgress?: (progress: SseProgress) => void;
};

type NoticeScope = {
  topic?: string;
  subscription?: string;
};

export function scopeFromBody(body: unknown): NoticeScope {
  if (!body || typeof body !== 'object') {
    return {};
  }
  const record = body as Record<string, unknown>;
  return {
    topic: typeof record.topic === 'string' ? record.topic : undefined,
    subscription: typeof record.subscription === 'string' ? record.subscription : undefined,
  };
}

export function sseNoticeState(
  progress: SseProgress | null,
  actionTitle?: string,
  scope?: NoticeScope,
) {
  const title = actionTitle || translations.working;
  const target = [scope?.topic, scope?.subscription].filter(Boolean).join(' / ') || undefined;
  if (!progress) {
    return { title, percent: undefined as number | undefined, detail: undefined as string | undefined, target };
  }
  const percent = progress.total
    ? Math.min(100, Math.round(((progress.done || 0) / progress.total) * 100))
    : undefined;
  const detail = percent == null && typeof progress.done === 'number'
    ? translations.checkedEvents.replace('{count}', progress.done.toLocaleString('en-US'))
    : undefined;
  return { title, percent, detail, target };
}

function noticeDescription(progress: SseProgress | null, scope?: NoticeScope) {
  const { percent, detail } = sseNoticeState(progress, undefined, scope);
  return (
    <>
      {percent != null
        ? <Progress percent={percent} status={percent >= 100 ? 'success' : 'active'} />
        : <Progress percent={100} status="active" showInfo={false} />}
      {detail ? <div>{detail}</div> : null}
      {scope?.topic || scope?.subscription ? (
        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4, color: 'rgba(0,0,0,0.45)', wordBreak: 'break-all' }}>
          {scope.topic ? <div>{scope.topic}</div> : null}
          {scope.subscription ? <div>{scope.subscription}</div> : null}
        </div>
      ) : null}
    </>
  );
}

export function useSseAction() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<SseProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const noticeKeyRef = useRef(`sse-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!processing) {
      return undefined;
    }
    return subscribeLeaveSiteWarning();
  }, [processing]);

  const run = useCallback(async <T = Record<string, unknown>>(
    path: string,
    body: unknown,
    runOptions?: RunOptions
  ): Promise<T | undefined> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const noticeKey = noticeKeyRef.current;

    const actionTitle = runOptions?.title || translations.working;
    const scope = scopeFromBody(body);

    setProcessing(true);
    setProgress(null);
    notification.open({
      key: noticeKey,
      message: actionTitle,
      description: noticeDescription(null, scope),
      duration: 0,
    });

    try {
      const result = await sseRequest<T>(path, body, {
        signal: controller.signal,
        onProgress: (next) => {
          setProgress(next);
          runOptions?.onProgress?.(next);
          const { title } = sseNoticeState(next, actionTitle, scope);
          notification.open({
            key: noticeKey,
            message: title,
            description: noticeDescription(next, scope),
            duration: 0,
          });
        },
      });
      notification.open({
        key: noticeKey,
        message: actionTitle,
        description: noticeDescription({ done: 1, total: 1 }, scope),
        duration: 2,
      });
      return result;
    } catch (err: any) {
      notification.destroy(noticeKey);
      if (err?.name === 'AbortError') {
        return undefined;
      }
      message.error(translations.somethingWentWrong);
      throw err;
    } finally {
      setProcessing(false);
      setProgress(null);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, []);

  return { run, processing, progress };
}
