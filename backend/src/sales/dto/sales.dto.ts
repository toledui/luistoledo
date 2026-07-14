import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  IsArray,
  Max,
  Min,
} from 'class-validator';

export class AddCartItemDto {
  @IsString() courseId!: string;
}
export class CouponCodeDto {
  @IsString() code!: string;
  @IsArray() @IsString({ each: true }) courseIds!: string[];
}
export class CheckoutDto {
  @IsOptional() @IsString() couponCode?: string;
  @IsIn(['STRIPE', 'BANK_TRANSFER']) paymentMethod!: 'STRIPE' | 'BANK_TRANSFER';
}
export class ConfirmStripeCheckoutDto {
  @IsString() orderId!: string;
  @IsString() sessionId!: string;
}

export class UpdatePaymentSettingsDto {
  @IsBoolean() stripeEnabled!: boolean;
  @IsIn(['TEST', 'LIVE']) stripeMode!: 'TEST' | 'LIVE';
  @IsOptional() @IsString() stripePublishableKey?: string;
  @IsOptional() @IsString() stripeSecretKey?: string;
  @IsOptional() @IsString() stripeWebhookSecret?: string;
  @IsBoolean() bankTransferEnabled!: boolean;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankBeneficiary?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() bankClabe?: string;
  @IsOptional() @IsString() bankInstructions?: string;
  @Type(() => Number) @IsInt() @Min(1) paymentDeadlineHours!: number;
}
export class CreateCouponDto {
  @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amountOff?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumAmount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
