import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtTokenService: JwtTokenService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AUTH_ADMIN_USERNAME: 'admin',
          AUTH_ADMIN_PASSWORD: 'super-secret',
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

  it('returns a bearer token for valid admin credentials', async () => {
    const response = await service.login({
      username: 'admin',
      password: 'super-secret',
    });

    expect(response).toEqual({
      accessToken: expect.any(String),
      tokenType: 'Bearer',
      expiresIn: '1h',
      role: 'admin',
    });
    expect(jwtTokenService.verify(response.accessToken)).toEqual(
      expect.objectContaining({
        username: 'admin',
        role: 'admin',
      }),
    );
  });

  it('rejects invalid credentials', async () => {
    await expect(
      service.login({
        username: 'admin',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('fails when admin credentials are not configured', async () => {
    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string | undefined> = {
        JWT_SECRET: 'jwt-secret',
        JWT_EXPIRES_IN: '1h',
      };

      return config[key];
    });

    await expect(
      service.login({
        username: 'admin',
        password: 'super-secret',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
