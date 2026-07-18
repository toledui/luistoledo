import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  AddCartItemDto,
  CheckoutDto,
  ConfirmStripeCheckoutDto,
  CouponCodeDto,
  CreateCouponDto,
  UpdatePaymentSettingsDto,
} from './dto/sales.dto';
import { SalesService } from './sales.service';

@Controller()
export class SalesController {
  constructor(private readonly sales: SalesService) {}
  @Get('cart') @UseGuards(AuthGuard) cart(@Req() req: AuthenticatedRequest) {
    return this.sales.cart(req.auth.sub);
  }
  @Post('cart/items') @UseGuards(AuthGuard) add(
    @Body() dto: AddCartItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.add(req.auth.sub, dto.courseId);
  }
  @Delete('cart/items/:id') @UseGuards(AuthGuard) remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.remove(req.auth.sub, id);
  }
  @Delete('cart') @UseGuards(AuthGuard) clear(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.clear(req.auth.sub);
  }
  @Post('coupons/validate') coupon(@Body() dto: CouponCodeDto) {
    return this.sales.validateCouponForCourses(dto.code, dto.courseIds);
  }
  @Post('checkout') @UseGuards(AuthGuard) checkout(
    @Body() dto: CheckoutDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.checkout(req.auth.sub, dto.paymentMethod, dto.couponCode);
  }
  @Post('payments/stripe/confirm')
  @UseGuards(AuthGuard)
  confirmStripeCheckout(
    @Body() dto: ConfirmStripeCheckoutDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.confirmStripeCheckout(
      req.auth.sub,
      dto.orderId,
      dto.sessionId,
    );
  }
  @Post('payments/webhooks/stripe')
  stripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!req.rawBody) throw new Error('Raw body no disponible');
    return this.sales.processStripeWebhook(signature, req.rawBody);
  }
  @Get('payments/methods')
  paymentMethods() {
    return this.sales.paymentSettings();
  }
  @Get('admin/settings/payments')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  adminPaymentSettings() {
    return this.sales.paymentSettings();
  }
  @Patch('admin/settings/payments')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  updatePaymentSettings(@Body() dto: UpdatePaymentSettingsDto) {
    return this.sales.updatePaymentSettings(dto);
  }
  @Post('admin/orders/:orderId/approve-transfer')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('orders.manage')
  approveTransfer(@Param('orderId') orderId: string) {
    return this.sales.approveBankTransfer(orderId);
  }
  @Get('orders') @UseGuards(AuthGuard) orders(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.orders(req.auth.sub);
  }
  @Post('orders/:id/resume-payment')
  @UseGuards(AuthGuard)
  resumePayment(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.sales.resumePayment(req.auth.sub, id);
  }
  @Get('orders/:id') @UseGuards(AuthGuard) order(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.order(req.auth.sub, id);
  }
  @Get('admin/coupons')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('orders.manage')
  coupons() {
    return this.sales.coupons();
  }
  @Get('admin/orders')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('orders.manage')
  adminOrders() {
    return this.sales.adminOrders();
  }
  @Post('admin/coupons')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('orders.manage')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.sales.createCoupon(dto);
  }
}
