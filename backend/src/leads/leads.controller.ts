import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { LeadsService } from './leads.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto.js';
import { AddLeadNoteDto } from './dto/add-lead-note.dto.js';
import { ConvertLeadDto } from './dto/convert-lead.dto.js';

/** Gated on the same `MEMBERS` PermissionArea as MembersController — see its own comment. */
@ApiTags('leads')
@ApiBearerAuth()
@Controller({ path: 'leads', version: '1' })
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.VIEW)
  @ApiOperation({
    summary: 'List/search/filter leads.',
    description:
      'Pass followUpDueBy=<date> for "which leads need attention today" (open leads whose next follow-up is due or overdue). A TRAINER only ever sees leads assigned to them.',
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListLeadsQueryDto) {
    return this.leadsService.list(
      user.tenantId,
      query,
      { status: query.status, source: query.source, assignedToId: query.assignedToId, followUpDueBy: query.followUpDueBy },
      { id: user.id, role: user.role },
    );
  }

  @Post()
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Create a lead.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(user.tenantId, dto);
  }

  @Get(':id')
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single lead, with notes.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leadsService.findByIdInTenant(user.tenantId, id, { id: user.id, role: user.role });
  }

  @Patch(':id')
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.MANAGE)
  @ApiOperation({
    summary: 'Update a lead — contact info, status, assignment, or trial scheduling.',
    description: 'status cannot be set to CONVERTED here — use POST /leads/:id/convert.',
  })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(user.tenantId, id, dto);
  }

  @Post(':id/notes')
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Add a note to a lead.' })
  addNote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddLeadNoteDto) {
    return this.leadsService.addNote(user.tenantId, id, user.id, dto.body);
  }

  @Post(':id/convert')
  @RequirePermission(PermissionArea.MEMBERS, PermissionLevel.MANAGE)
  @ApiOperation({
    summary: 'Convert a lead into a member.',
    description:
      "Creates a new Member from the lead's contact details, or links an existing Member with a matching email if one already exists — never both. Returns the resulting member.",
  })
  convert(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.leadsService.convert(user.tenantId, id, dto, { id: user.id, role: user.role });
  }
}
