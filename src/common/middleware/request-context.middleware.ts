import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'crypto';

import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
    const requestId = randomUUID();
    const startedAt = Date.now();

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    response.on('finish', () => {
      const elapsedInMilliseconds = Date.now() - startedAt;
      console.info(
        `[${requestId}] ${request.method} ${request.originalUrl} ${response.statusCode} ${elapsedInMilliseconds}ms`,
      );
    });

    next();
  }
}
