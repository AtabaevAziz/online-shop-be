export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}
