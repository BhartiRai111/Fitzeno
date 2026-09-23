import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MemberNote } from '../../generated/prisma/client.js';

class NoteAuthorDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class MemberNoteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() body!: string;
  @ApiPropertyOptional({ type: NoteAuthorDto, nullable: true }) author!: NoteAuthorDto | null;
  @ApiProperty() createdAt!: Date;
}

type MemberNoteWithAuthor = MemberNote & { author: { id: string; firstName: string; lastName: string } | null };

export function toMemberNoteResponse(note: MemberNoteWithAuthor): MemberNoteResponseDto {
  return {
    id: note.id,
    body: note.body,
    author: note.author,
    createdAt: note.createdAt,
  };
}
