import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/types/jwt-payload.interface.js';
import { UserRole } from '../generated/prisma/enums.js';
import { TrainersService } from './trainers.service.js';
import { CreateTrainerDto } from './dto/create-trainer.dto.js';
import { UpdateTrainerDto } from './dto/update-trainer.dto.js';
import { ListTrainersQueryDto } from './dto/list-trainers-query.dto.js';
import { CreateAvailabilitySlotDto } from './dto/availability-slot.dto.js';

/**
 * Reads (list/get, availability) are open to any authenticated tenant user
 * with no permission gate — members need to browse trainers and see their
 * availability to book Personal Training, and Member doesn't participate in
 * the PermissionArea system at all (see role-permissions.const.ts). Writes
 * to the coaching profile itself (bio/specialties/certifications/status)
 * are OWNER/MANAGER only — this is gym business configuration, not
 * something a trainer or front-desk self-manages. A trainer's OWN
 * availability is the one self-service write, under /trainers/me.
 */
@ApiTags('trainers')
@ApiBearerAuth()
@Controller({ path: 'trainers', version: '1' })
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  @ApiOperation({ summary: 'Browse the gym\'s trainers.' })
  list(@Query() query: ListTrainersQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trainersService.list(user.tenantId, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a trainer coaching profile for an existing TRAINER-role staff member.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTrainerDto) {
    return this.trainersService.create(user.tenantId, dto);
  }

  @Get('me')
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: "The caller's own trainer profile." })
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.trainersService.findOwnProfile(user.tenantId, user.id);
  }

  @Post('me/availability')
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: 'Add a weekly availability window to the caller\'s own trainer profile.' })
  async addOwnAvailability(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAvailabilitySlotDto) {
    const trainerId = await this.trainersService.getOwnTrainerId(user.tenantId, user.id);
    return this.trainersService.addAvailabilitySlot(user.tenantId, trainerId, dto);
  }

  @Delete('me/availability/:slotId')
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: 'Remove one of the caller\'s own availability windows.' })
  async removeOwnAvailability(@CurrentUser() user: AuthenticatedUser, @Param('slotId') slotId: string) {
    const trainerId = await this.trainersService.getOwnTrainerId(user.tenantId, user.id);
    await this.trainersService.removeAvailabilitySlot(user.tenantId, trainerId, slotId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A single trainer profile, with weekly availability.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.trainersService.findByIdInTenant(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a trainer\'s coaching profile.' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTrainerDto) {
    return this.trainersService.update(user.tenantId, id, dto);
  }

  @Post(':id/availability')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: "Add a weekly availability window to a trainer's profile, on their behalf." })
  addAvailability(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateAvailabilitySlotDto) {
    return this.trainersService.addAvailabilitySlot(user.tenantId, id, dto);
  }

  @Delete(':id/availability/:slotId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: "Remove one of a trainer's availability windows, on their behalf." })
  async removeAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('slotId') slotId: string,
  ) {
    await this.trainersService.removeAvailabilitySlot(user.tenantId, id, slotId);
  }
}
