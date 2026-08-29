import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtTokenService } from './jwt-token.service';

type DemoAccount = {
  sub: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  login(dto: LoginRequestDto): LoginResponseDto {
    const account = this.getSupportedAccounts().find(
      (candidate) =>
        candidate.username === dto.username &&
        candidate.password === dto.password,
    );

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtTokenService.sign({
      sub: account.sub,
      username: account.username,
      role: account.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtTokenService.getExpiresIn(),
      role: account.role,
    };
  }

  private getSupportedAccounts(): DemoAccount[] {
    return [
      {
        sub: 'admin-user',
        username:
          this.configService.get<string>('AUTH_ADMIN_USERNAME') ?? 'admin',
        password:
          this.configService.get<string>('AUTH_ADMIN_PASSWORD') ??
          'super-secret',
        role: 'admin',
      },
      {
        sub: 'demo-user',
        username:
          this.configService.get<string>('AUTH_DEMO_USERNAME') ?? 'user',
        password:
          this.configService.get<string>('AUTH_DEMO_PASSWORD') ?? 'user-secret',
        role: 'user',
      },
    ];
  }
}
