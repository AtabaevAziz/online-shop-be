import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

import { AuthTokenPayload } from './interfaces/auth-token-payload.interface';

type SignPayload = Omit<AuthTokenPayload, 'iat' | 'exp'>;

@Injectable()
export class JwtTokenService {
  constructor(private readonly configService: ConfigService) {}

  sign(payload: SignPayload): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const tokenPayload: AuthTokenPayload = {
      ...payload,
      iat: nowInSeconds,
      exp: nowInSeconds + this.parseExpiresInToSeconds(this.getExpiresIn()),
    };

    const headerSegment = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payloadSegment = this.encode(tokenPayload);
    const signatureSegment = this.signSegments(headerSegment, payloadSegment);

    return `${headerSegment}.${payloadSegment}.${signatureSegment}`;
  }

  verify(token: string): AuthTokenPayload {
    try {
      const [headerSegment, payloadSegment, signatureSegment] = token.split('.');

      if (!headerSegment || !payloadSegment || !signatureSegment) {
        throw new UnauthorizedException('Invalid token');
      }

      const expectedSignature = this.signSegments(headerSegment, payloadSegment);
      const isValidSignature =
        expectedSignature.length === signatureSegment.length &&
        timingSafeEqual(Buffer.from(signatureSegment), Buffer.from(expectedSignature));

      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid token signature');
      }

      const payload = this.decode<AuthTokenPayload>(payloadSegment);
      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (payload.exp <= nowInSeconds) {
        throw new UnauthorizedException('Token has expired');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid token');
    }
  }

  getExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') ?? '1h';
  }

  private signSegments(headerSegment: string, payloadSegment: string): string {
    return createHmac('sha256', this.getSecret())
      .update(`${headerSegment}.${payloadSegment}`)
      .digest('base64url');
  }

  private getSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new InternalServerErrorException('JWT secret is not configured');
    }

    return secret;
  }

  private parseExpiresInToSeconds(expiresIn: string): number {
    const trimmedExpiresIn = expiresIn.trim();

    if (/^\d+$/.test(trimmedExpiresIn)) {
      return Number(trimmedExpiresIn);
    }

    const match = trimmedExpiresIn.match(/^(\d+)([smhd])$/i);

    if (!match) {
      throw new InternalServerErrorException('Invalid JWT_EXPIRES_IN value');
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const unitToSecondsMap: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * unitToSecondsMap[unit];
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decode<T>(segment: string): T {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
  }
}
