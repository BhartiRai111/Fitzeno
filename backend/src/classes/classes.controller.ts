import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { PermissionArea, PermissionLevel, UserRole } from '../generated/prisma/enums.js';
import { RequirePermission } from '../authz/require-permission.decorator.js';
import { MembersService } from '../members/members.service.js';
import { ClassesService } from './classes.service.js';
import { CreateClassSeriesDto } from './dto/create-class-series.dto.js';
import { UpdateClassSeriesDto } from './dto/update-class-series.dto.js';
import { ListClassSeriesQueryDto } from './dto/list-class-series-query.dto.js';
import { ListClassOccurrencesQueryDto } from './dto/list-class-occurrences-query.dto.js';
import { UpdateClassOccurrenceDto } from './dto/update-class-occurrence.dto.js';
import { CancelClassDto } from './dto/cancel-class.dto.js';

/**
 * Two surfaces: /classes/series manages the recurring TEMPLATE
 * (owner/manager/trainer-with-bookings-permission only — gated on
 * BOOKINGS, matching "Class schedule, bookings, and waitlists" in the
 * approved frontend's permission catalogue), while /classes browses/reads
 * the actual dated, bookable occurrences and is open to any authenticated
 * tenant user — members need this to build their booking timetable, and
 * MEMBER doesn't participate in the PermissionArea system at all.
 */
@ApiTags('classes')
@ApiBearerAuth()
@Controller({ path: 'classes', version: '1' })
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly membersService: MembersService,
  ) {}

  @Get('series')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'List/search recurring class series.', description: 'A TRAINER only ever sees series assigned to them.' })
  listSeries(@CurrentUser() user: AuthenticatedUser, @Query() query: ListClassSeriesQueryDto) {
    if (user.role === UserRole.TRAINER) {
      query.trainerId = user.id;
    }
    return this.classesService.listSeries(user.tenantId, query);
  }

  @Post('series')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Create a recurring class.' })
  createSeries(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClassSeriesDto) {
    return this.classesService.createSeries(user.tenantId, dto);
  }

  @Get('series/:id')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.VIEW)
  @ApiOperation({ summary: 'A single class series template.' })
  findSeries(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.classesService.findSeriesByIdInTenant(user.tenantId, id);
  }

  @Patch('series/:id')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({
    summary: 'Update a class series.',
    description: 'Only affects occurrences generated after this change — already-generated future sessions keep their original details unless edited individually via PATCH /classes/:occurrenceId.',
  })
  updateSeries(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateClassSeriesDto) {
    return this.classesService.updateSeries(user.tenantId, id, dto);
  }

  @Post('series/:id/cancel')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Cancel a recurring class entirely — cancels every future scheduled session and its bookings too.' })
  cancelSeries(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelClassDto) {
    return this.classesService.cancelSeries(user.tenantId, id, dto.reason);
  }

  @Get()
  @ApiOperation({
    summary: 'Browse bookable class sessions in a date range.',
    description: 'Defaults to today through 8 weeks out. Generates any not-yet-materialized sessions for the requested range on the fly.',
  })
  async listOccurrences(@CurrentUser() user: AuthenticatedUser, @Query() query: ListClassOccurrencesQueryDto) {
    const memberId = await this.resolveCallerMemberId(user);
    return this.classesService.listOccurrences(user.tenantId, query, memberId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A single class session, with live seat counts.' })
  async findOccurrence(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const memberId = await this.resolveCallerMemberId(user);
    return this.classesService.findOccurrenceByIdInTenant(user.tenantId, id, memberId);
  }

  @Patch(':id')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Override one session\'s trainer, time, location, or capacity without touching the series template.' })
  updateOccurrence(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateClassOccurrenceDto) {
    return this.classesService.updateOccurrence(user.tenantId, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermission(PermissionArea.BOOKINGS, PermissionLevel.MANAGE)
  @ApiOperation({ summary: 'Cancel a single class session — cancels its existing bookings too.' })
  cancelOccurrence(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelClassDto) {
    return this.classesService.cancelOccurrence(user.tenantId, id, dto.reason);
  }

  /** MEMBER callers get their own booking status folded into each occurrence; anyone else gets none. */
  private async resolveCallerMemberId(user: AuthenticatedUser): Promise<string | undefined> {
    if (user.role !== UserRole.MEMBER) {
      return undefined;
    }
    try {
      return await this.membersService.getOwnMemberId(user.tenantId, user.id);
    } catch {
      return undefined;
    }
  }
}
