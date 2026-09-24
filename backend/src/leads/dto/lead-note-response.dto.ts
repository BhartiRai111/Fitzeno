import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LeadNote } from '../../generated/prisma/client.js';

class NoteAuthorDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class LeadNoteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() body!: string;
  @ApiPropertyOptional({ type: NoteAuthorDto, nullable: true }) author!: NoteAuthorDto | null;
  @ApiProperty() createdAt!: Date;
}

type LeadNoteWithAuthor = LeadNote & { author: { id: string; firstName: string; lastName: string } | null };

export function toLeadNoteResponse(note: LeadNoteWithAuthor): LeadNoteResponseDto {
  return {
    id: note.id,
    body: note.body,
    author: note.author,
    createdAt: note.createdAt,
  };
}
