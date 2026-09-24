import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

/**
 * The refresh token is deliberately NOT in this body — it's set as an
 * httpOnly cookie by the endpoint that returns this, so it's never
 * reachable from client-side JS (the standard XSS-resistant pattern for a
 * long-lived credential). The access token here is short-lived and meant
 * to be kept in memory and sent as `Authorization: Bearer <token>`.
 */
export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ description: 'Access token lifetime in seconds.' })
  expiresIn!: number;
}
