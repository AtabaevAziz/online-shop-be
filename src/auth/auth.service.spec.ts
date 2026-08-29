import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtTokenService: JwtTokenService;
  let configService: { get: jest.Mock<string | undefined, [string]> };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AUTH_ADMIN_USERNAME: 'admin',
          AUTH_ADMIN_PASSWORD: 'super-secret',
          AUTH_DEMO_USERNAME: 'user',
          AUTH_DEMO_PASSWORD: 'user-secret',
          JWT_SECRET: 'jwt-secret',
          JWT_EXPIRES_IN: '1h',
        };

        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtTokenService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtTokenService = module.get<JwtTokenService>(JwtTokenService);
  });

  it('returns a bearer token for valid admin credentials', () => {
    const response = service.login({
      username: 'admin',
      password: 'super-secret',
    });

    expect(typeof response.accessToken).toBe('string');
    expect(response.accessToken).not.toHaveLength(0);
    expect(response.tokenType).toBe('Bearer');
    expect(response.expiresIn).toBe('1h');
    expect(response.role).toBe('admin');
    expect(jwtTokenService.verify(response.accessToken)).toEqual(
      expect.objectContaining({
        username: 'admin',
        role: 'admin',
      }),
    );
  });

  it('rejects invalid credentials', () => {
    expect(() =>
      service.login({
        username: 'admin',
        password: 'wrong-password',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('returns a bearer token for valid demo user credentials', () => {
    const response = service.login({
      username: 'user',
      password: 'user-secret',
    });

    expect(typeof response.accessToken).toBe('string');
    expect(response.accessToken).not.toHaveLength(0);
    expect(response.tokenType).toBe('Bearer');
    expect(response.expiresIn).toBe('1h');
    expect(response.role).toBe('user');
    expect(jwtTokenService.verify(response.accessToken)).toEqual(
      expect.objectContaining({
        username: 'user',
        role: 'user',
      }),
    );
  });

  it('falls back to built-in demo credentials when env values are absent', () => {
    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string | undefined> = {
        JWT_SECRET: 'jwt-secret',
        JWT_EXPIRES_IN: '1h',
      };

      return config[key];
    });

    expect(
      service.login({ username: 'admin', password: 'super-secret' }),
    ).toEqual(
      expect.objectContaining({
        tokenType: 'Bearer',
        role: 'admin',
      }),
    );
    expect(
      service.login({ username: 'user', password: 'user-secret' }),
    ).toEqual(
      expect.objectContaining({
        tokenType: 'Bearer',
        role: 'user',
      }),
    );
  });
});
