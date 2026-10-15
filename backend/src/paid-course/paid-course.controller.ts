import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { ListPaymentPlansDto, UpdatePlanRemindersDto } from './paid-course.dto';
import { PaidCourseService } from './paid-course.service';

@Controller()
export class PaidCourseController {
  constructor(private readonly course: PaidCourseService) {}
  @Get('paid-course') offer() {
    return this.course.publicOffer();
  }
  @Patch('paid-course/reminders') @UseGuards(AuthGuard) userReminders(
    @Body() dto: UpdatePlanRemindersDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.course.setUserReminders(request.auth.sub, dto.remindersEnabled);
  }
  @Get('admin/paid-course/summary')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('orders.manage')
  summary() {
    return this.course.summary();
  }
  @Get('admin/paid-course/plans')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('orders.manage')
  plans(@Query() query: ListPaymentPlansDto) {
    return this.course.listPlans(query);
  }
  @Get('admin/paid-course/plans/:id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('orders.manage')
  plan(@Param('id') id: string) {
    return this.course.getPlan(id);
  }
  @Patch('admin/paid-course/plans/:id/reminders')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('orders.manage')
  reminders(
    @Param('id') id: string,
    @Body() dto: UpdatePlanRemindersDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.course.setReminders(id, dto.remindersEnabled, request.auth.sub);
  }
}
