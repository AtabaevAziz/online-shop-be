import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { JwtTokenService } from '../jwt-token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = this.extractBearerToken(authorization);

    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    request.user = this.jwtTokenService.verify(token);
    return true;
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }

    const token = authorization.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }
}
