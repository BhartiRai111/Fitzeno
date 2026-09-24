import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsEventListener } from './notifications-event.listener.js';
import { NotificationsSchedulerService } from './notifications-scheduler.service.js';
import { AnnouncementsService } from './announcements.service.js';
import { AnnouncementsController } from './announcements.controller.js';

/**
 * The reusable in-app notification layer every business module delivers
 * through — see the schema's own phase-level comment and
 * events/domain-events.ts for the full architecture.
 *
 * Deliberately NOT imported by any business module (Memberships, Payments,
 * Classes, ClassBookings, PtSessions): they emit events via EventEmitter2
 * directly (made available app-wide by EventEmitterModule.forRoot() in
 * AppModule, so no per-module import is needed to emit one) and never call
 * NotificationsService themselves — see domain-events.ts's own comment for
 * why that's the whole point of the event/listener split. This module only
 * ever imports OUTWARD (nothing here), keeping the dependency direction
 * one-way and ruling out any import cycle with the modules it reacts to.
 *
 * @nestjs/schedule's `@Cron` decorators on NotificationsSchedulerService
 * are picked up automatically once ScheduleModule.forRoot() is registered
 * anywhere in the app (see AppModule) — no wiring needed here either.
 */
@Module({
  controllers: [NotificationsController, AnnouncementsController],
  providers: [NotificationsService, NotificationsEventListener, NotificationsSchedulerService, AnnouncementsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
