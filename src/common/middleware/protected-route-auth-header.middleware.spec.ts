import { UnauthorizedException } from '@nestjs/common';

import { ProtectedRouteAuthHeaderMiddleware } from './protected-route-auth-header.middleware';

describe('ProtectedRouteAuthHeaderMiddleware', () => {
  const middleware = new ProtectedRouteAuthHeaderMiddleware();

  it('rejects requests without an authorization header', () => {
    expect(() =>
      middleware.use({ headers: {} } as never, {} as never, jest.fn()),
    ).toThrow(UnauthorizedException);
  });

  it('rejects requests with a non-bearer authorization header', () => {
    expect(() =>
      middleware.use(
        { headers: { authorization: 'Basic abc123' } } as never,
        {} as never,
        jest.fn(),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('rejects requests with an empty bearer token', () => {
    expect(() =>
      middleware.use(
        { headers: { authorization: 'Bearer   ' } } as never,
        {} as never,
        jest.fn(),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('allows requests with a bearer token', () => {
    const next = jest.fn();

    middleware.use(
      { headers: { authorization: 'Bearer token-value' } } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalled();
  });
});
