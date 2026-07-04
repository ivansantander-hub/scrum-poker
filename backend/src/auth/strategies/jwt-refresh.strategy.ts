import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtRefreshPayload {
  sub: string;
  type: string;
}

function extractRefreshToken(req: Request): string | null {
  if (req?.cookies?.refresh_token) {
    return req.cookies.refresh_token;
  }
  return null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    });
  }

  validate(payload: JwtRefreshPayload) {
    return { userId: payload.sub };
  }
}
