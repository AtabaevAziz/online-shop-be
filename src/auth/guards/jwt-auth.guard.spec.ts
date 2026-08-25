import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const jwtTokenService = {
    verify: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without a bearer token', () => {
    const guard = new JwtAuthGuard(jwtTokenService as never);
    const request = {
      headers: {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('attaches the verified user to the request', () => {
    const guard = new JwtAuthGuard(jwtTokenService as never);
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    jwtTokenService.verify.mockReturnValue({
      sub: 'admin-user',
      username: 'admin',
      role: 'admin',
      iat: 1,
      exp: 2,
    });

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(jwtTokenService.verify).toHaveBeenCalledWith('valid-token');
    expect(request).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          username: 'admin',
          role: 'admin',
        }),
      }),
    );
  });
});
