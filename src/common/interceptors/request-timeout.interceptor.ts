import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';

@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutInMilliseconds = 5000) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutInMilliseconds),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request processing exceeded the time limit'),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
