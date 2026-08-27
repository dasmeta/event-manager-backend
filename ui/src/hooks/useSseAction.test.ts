import { renderHook, act } from '@testing-library/react';
import { subscribeLeaveSiteWarning } from '@/utils/leaveSiteWarning';
import { scopeFromBody, sseNoticeState, useSseAction } from '@/hooks/useSseAction';

jest.mock('antd', () => ({
  Progress: () => null,
  message: { error: jest.fn() },
  notification: { open: jest.fn(), destroy: jest.fn() },
}));

jest.mock('@/services/sseRequest', () => ({
  sseRequest: jest.fn().mockResolvedValue({}),
}));

describe('scopeFromBody', () => {
  it('reads topic and subscription from the request body', () => {
    expect(scopeFromBody({ topic: 'orders', subscription: 'email' })).toEqual({
      topic: 'orders',
      subscription: 'email',
    });
  });

  it('ignores a body without topic or subscription', () => {
    expect(scopeFromBody({})).toEqual({
      topic: undefined,
      subscription: undefined,
    });
  });
});

describe('sseNoticeState', () => {
  it('uses Working with no percent before progress', () => {
    expect(sseNoticeState(null)).toEqual({
      title: 'Working…',
      percent: undefined,
      detail: undefined,
      target: undefined,
    });
  });

  it('uses the action title instead of Working', () => {
    expect(sseNoticeState({ done: 1, total: 2 }, 'Republishing errors')).toEqual({
      title: 'Republishing errors',
      percent: 50,
      detail: undefined,
      target: undefined,
    });
  });

  it('shows a percent when total is known', () => {
    expect(sseNoticeState({ done: 230, total: 273 })).toEqual({
      title: 'Working…',
      percent: 84,
      detail: undefined,
      target: undefined,
    });
  });

  it('shows how many events were checked when total is unknown', () => {
    expect(sseNoticeState({ done: 10000, label: 'page 0' })).toEqual({
      title: 'Working…',
      percent: undefined,
      detail: 'Checked 10,000 events',
      target: undefined,
    });
  });

  it('joins topic and subscription for the toast target', () => {
    expect(sseNoticeState(null, 'Republishing errors', {
      topic: 'orders.created',
      subscription: 'email-worker',
    })).toEqual({
      title: 'Republishing errors',
      percent: undefined,
      detail: undefined,
      target: 'orders.created / email-worker',
    });
  });
});

describe('subscribeLeaveSiteWarning', () => {
  it('registers beforeunload while subscribed and removes after', () => {
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const unsubscribe = subscribeLeaveSiteWarning();
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    const handler = add.mock.calls.find((call) => call[0] === 'beforeunload')?.[1] as EventListener;
    const event = { preventDefault: jest.fn(), returnValue: undefined } as any;
    handler(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');

    unsubscribe();
    expect(remove).toHaveBeenCalledWith('beforeunload', handler);
    add.mockRestore();
    remove.mockRestore();
  });
});

describe('useSseAction', () => {
  const { sseRequest } = require('@/services/sseRequest');
  const { notification } = require('antd');

  beforeEach(() => {
    sseRequest.mockReset();
    sseRequest.mockResolvedValue({});
    notification.open.mockClear();
    notification.destroy.mockClear();
  });

  it('adds beforeunload while processing and removes it after success', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    sseRequest.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const { result } = renderHook(() => useSseAction());

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.run('/x', {});
    });

    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    await act(async () => {
      resolveRequest({});
      await pending;
    });

    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    add.mockRestore();
    remove.mockRestore();
  });

  it('keeps a completed notification briefly after success', async () => {
    const { notification } = require('antd');
    sseRequest.mockResolvedValue({});
    const { result } = renderHook(() => useSseAction());

    await act(async () => {
      await result.current.run('/x', {}, { title: 'Republishing errors' });
    });

    expect(notification.destroy).not.toHaveBeenCalled();
    expect(notification.open).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Republishing errors',
      duration: 2,
    }));
  });
});
