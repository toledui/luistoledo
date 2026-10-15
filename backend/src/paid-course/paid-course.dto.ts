import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export class ListPaymentPlansDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(191) search?: string;
  @IsOptional() @IsIn(['FULL', 'INSTALLMENTS']) option?:
    'FULL' | 'INSTALLMENTS';
  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE', 'COMPLETED', 'OVERDUE'])
  state?: string;
}
export class UpdatePlanRemindersDto {
  @IsBoolean() remindersEnabled!: boolean;
}
export class CreatePaidCourseCheckoutDto {
  @IsString() @MaxLength(191) userId!: string;
  @IsIn(['FULL', 'INSTALLMENTS']) paymentOption!: 'FULL' | 'INSTALLMENTS';
  @IsIn(['STRIPE', 'BANK_TRANSFER']) paymentMethod!: 'STRIPE' | 'BANK_TRANSFER';
}
