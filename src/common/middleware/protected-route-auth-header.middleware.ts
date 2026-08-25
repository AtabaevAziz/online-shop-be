import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';

@Injectable()
export class ProtectedRouteAuthHeaderMiddleware implements NestMiddleware {
  use(request: AuthenticatedRequest, _response: Response, next: NextFunction): void {
    // Middleware checks request headers before auth/role guards run.
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header must use Bearer token');
    }

    if (authorization.slice('Bearer '.length).trim().length === 0) {
      throw new UnauthorizedException('Bearer token is required');
    }

    next();
  }
}
