import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtTokenService } from './jwt-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const username = this.configService.get<string>('AUTH_ADMIN_USERNAME');
    const password = this.configService.get<string>('AUTH_ADMIN_PASSWORD');

    if (!username || !password) {
      throw new InternalServerErrorException('Admin credentials are not configured');
    }

    if (dto.username !== username || dto.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtTokenService.sign({
      sub: 'admin-user',
      username,
      role: 'admin',
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtTokenService.getExpiresIn(),
      role: 'admin',
    };
  }
}
