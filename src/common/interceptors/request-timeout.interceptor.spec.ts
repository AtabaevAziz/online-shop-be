import { CallHandler, ExecutionContext, RequestTimeoutException } from '@nestjs/common';
import { lastValueFrom, map, of, timer } from 'rxjs';

import { RequestTimeoutInterceptor } from './request-timeout.interceptor';

describe('RequestTimeoutInterceptor', () => {
  it('passes through fast responses', async () => {
    const interceptor = new RequestTimeoutInterceptor(20);
    const next = {
      handle: () => of('ok'),
    } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept({} as ExecutionContext, next)),
    ).resolves.toBe('ok');
  });

  it('throws request timeout for slow responses', async () => {
    jest.useFakeTimers();
    const interceptor = new RequestTimeoutInterceptor(5);
    const next = {
      handle: () => timer(10).pipe(map(() => 'late')),
    } as CallHandler;

    const resultPromise = lastValueFrom(interceptor.intercept({} as ExecutionContext, next));
    jest.advanceTimersByTime(10);

    await expect(resultPromise).rejects.toBeInstanceOf(RequestTimeoutException);
    jest.useRealTimers();
  });
});
