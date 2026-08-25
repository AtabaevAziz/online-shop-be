export class LoginResponseDto {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  role: 'admin';
}
