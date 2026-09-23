import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { TrainerStatus, UserRole } from '../generated/prisma/enums.js';
import type { CreateTrainerDto } from './dto/create-trainer.dto.js';
import type { UpdateTrainerDto } from './dto/update-trainer.dto.js';
import type { CreateAvailabilitySlotDto } from './dto/availability-slot.dto.js';
import { PaginatedResult } from '../common/dto/pagination-query.dto.js';
import {
  toTrainerResponse,
  toAvailabilitySlotResponse,
  type TrainerResponseDto,
  type AvailabilitySlotResponseDto,
} from './dto/trainer-response.dto.js';
import type { ListTrainersQueryDto } from './dto/list-trainers-query.dto.js';

const withRelations = {
  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  availability: true,
};

/** Two windows on the same day overlap iff one starts before the other ends, both ways. */
function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

@Injectable()
export class TrainersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /** Used by ClassesService/PtSessionsService to validate a trainerId without importing this module's controller surface. */
  async assertTrainerUser(tenantId: string, userId: string): Promise<void> {
    const user = await this.usersService.findByIdInTenant(tenantId, userId);
    if (user.role !== UserRole.TRAINER) {
      throw new BadRequestException('trainerId must reference a trainer in this gym.');
    }
  }

  async create(tenantId: string, dto: CreateTrainerDto): Promise<TrainerResponseDto> {
    await this.assertTrainerUser(tenantId, dto.userId);

    const existing = await this.prisma.trainer.findUnique({ where: { userId: dto.userId } });
    if (existing) {
      throw new ConflictException('This user already has a trainer profile.');
    }

    const trainer = await this.prisma.trainer.create({
      data: {
        tenantId,
        userId: dto.userId,
        bio: dto.bio,
        specialties: dto.specialties ?? [],
        certifications: dto.certifications ?? [],
        yearsExperience: dto.yearsExperience,
        offersPersonalTraining: dto.offersPersonalTraining ?? true,
      },
      include: withRelations,
    });
    return toTrainerResponse(trainer);
  }

  async findByIdInTenant(tenantId: string, id: string): Promise<TrainerResponseDto> {
    const trainer = await this.prisma.trainer.findFirst({ where: { id, tenantId }, include: withRelations });
    if (!trainer) {
      throw new NotFoundException('Trainer not found.');
    }
    return toTrainerResponse(trainer);
  }

  async findOwnProfile(tenantId: string, userId: string): Promise<TrainerResponseDto> {
    const trainer = await this.prisma.trainer.findFirst({ where: { tenantId, userId }, include: withRelations });
    if (!trainer) {
      throw new NotFoundException("You don't have a trainer profile yet.");
    }
    return toTrainerResponse(trainer);
  }

  /** Raw id resolution for internal cross-module use (e.g. resolving "me" to a trainerId for availability writes). */
  async getOwnTrainerId(tenantId: string, userId: string): Promise<string> {
    const trainer = await this.prisma.trainer.findFirst({ where: { tenantId, userId }, select: { id: true } });
    if (!trainer) {
      throw new NotFoundException("You don't have a trainer profile yet.");
    }
    return trainer.id;
  }

  async update(tenantId: string, id: string, dto: UpdateTrainerDto): Promise<TrainerResponseDto> {
    await this.requireInTenant(tenantId, id);
    const trainer = await this.prisma.trainer.update({
      where: { id },
      data: {
        bio: dto.bio,
        specialties: dto.specialties,
        certifications: dto.certifications,
        yearsExperience: dto.yearsExperience,
        status: dto.status,
        offersPersonalTraining: dto.offersPersonalTraining,
      },
      include: withRelations,
    });
    return toTrainerResponse(trainer);
  }

  async list(tenantId: string, query: ListTrainersQueryDto): Promise<PaginatedResult<TrainerResponseDto>> {
    const where = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.offersPersonalTraining !== undefined ? { offersPersonalTraining: query.offersPersonalTraining } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' as const } },
                { lastName: { contains: query.search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };

    const sortableFields = ['createdAt', 'yearsExperience'];
    const sortBy = sortableFields.includes(query.sortBy ?? '') ? query.sortBy! : 'createdAt';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.trainer.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
        include: withRelations,
      }),
      this.prisma.trainer.count({ where }),
    ]);

    return new PaginatedResult(items.map(toTrainerResponse), totalItems, query.page, query.limit);
  }

  /**
   * Rejects an availability window that overlaps one the trainer already
   * has on the same day — a trainer can't be "available" twice over for
   * the same slot, and merging/splitting windows isn't worth the added
   * complexity this product doesn't need yet.
   */
  async addAvailabilitySlot(
    tenantId: string,
    trainerId: string,
    dto: CreateAvailabilitySlotDto,
  ): Promise<AvailabilitySlotResponseDto> {
    await this.requireInTenant(tenantId, trainerId);
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('endTime must be after startTime.');
    }

    const sameDay = await this.prisma.trainerAvailability.findMany({
      where: { trainerId, dayOfWeek: dto.dayOfWeek },
    });
    const overlap = sameDay.some((slot) => timesOverlap(dto.startTime, dto.endTime, slot.startTime, slot.endTime));
    if (overlap) {
      throw new ConflictException('This overlaps an existing availability window on this day.');
    }

    const slot = await this.prisma.trainerAvailability.create({
      data: { trainerId, dayOfWeek: dto.dayOfWeek, startTime: dto.startTime, endTime: dto.endTime },
    });
    return toAvailabilitySlotResponse(slot);
  }

  async removeAvailabilitySlot(tenantId: string, trainerId: string, slotId: string): Promise<void> {
    await this.requireInTenant(tenantId, trainerId);
    const slot = await this.prisma.trainerAvailability.findFirst({ where: { id: slotId, trainerId } });
    if (!slot) {
      throw new NotFoundException('Availability slot not found.');
    }
    await this.prisma.trainerAvailability.delete({ where: { id: slotId } });
  }

  /**
   * Used by PtSessionsService to validate a trainer is active + PT-bookable,
   * and to read their windows. Keyed by userId (not the Trainer profile's
   * own id) — "trainerId" means the coaching User's id everywhere else in
   * this backend (Member.trainerId, ClassSeries.trainerId,
   * ClassOccurrence.trainerId), so PT sessions follow the same convention
   * rather than introducing a second identifier scheme.
   */
  async getActiveBookableTrainer(tenantId: string, userId: string) {
    const trainer = await this.prisma.trainer.findFirst({
      where: { userId, tenantId },
      include: { availability: true },
    });
    if (!trainer) {
      throw new NotFoundException("This user doesn't have a trainer profile.");
    }
    if (trainer.status !== TrainerStatus.ACTIVE || !trainer.offersPersonalTraining) {
      throw new BadRequestException('This trainer is not currently bookable for personal training.');
    }
    return trainer;
  }

  private async requireInTenant(tenantId: string, id: string): Promise<void> {
    const exists = await this.prisma.trainer.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Trainer not found.');
    }
  }
}
