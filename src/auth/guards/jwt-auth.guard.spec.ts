import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { AuthTokenPayload } from '../interfaces/auth-token-payload.interface';
import { JwtTokenService } from '../jwt-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const verifyMock: jest.MockedFunction<JwtTokenService['verify']> = jest.fn(
    (token: string): AuthTokenPayload => {
      throw new Error(`Unexpected token verification for ${token}`);
    },
  );
  const jwtTokenService: Pick<JwtTokenService, 'verify'> = {
    verify: verifyMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without a bearer token', () => {
    const guard = new JwtAuthGuard(jwtTokenService as never);
    const request = {
      headers: {},
    } as AuthenticatedRequest;

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
    } as AuthenticatedRequest;

    verifyMock.mockReturnValue({
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
    expect(verifyMock).toHaveBeenCalledWith('valid-token');
    expect(request.user).toBeDefined();
    expect(request.user?.username).toBe('admin');
    expect(request.user?.role).toBe('admin');
  });
});
