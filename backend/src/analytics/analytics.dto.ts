import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  IsNumber,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
export class AnalyticsItemDto {
  @IsString() @MaxLength(100) item_id!: string;
  @IsString() @MaxLength(100) item_name!: string;
  @IsNumber() @Min(0) @Max(10000000) price!: number;
  @IsInt() @Min(1) @Max(100) quantity!: number;
}
export class AnalyticsSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @Matches(/^(GTM-[A-Z0-9]+)?$/) @MaxLength(40) gtmId?: string;
  @IsOptional()
  @Matches(/^(G-[A-Z0-9]+)?$/)
  @MaxLength(40)
  gaMeasurementId?: string;
  @IsOptional() @Matches(/^\d*$/) @MaxLength(40) gaPropertyId?: string;
  @IsOptional() @Matches(/^\d*$/) @MaxLength(40) metaPixelId?: string;
  @IsOptional() @Matches(/^v\d+\.0$/) metaApiVersion?: string;
  @IsOptional() @IsString() @MaxLength(255) searchConsoleSite?: string;
  @IsOptional() @IsString() @MaxLength(500) gaSecret?: string;
  @IsOptional() @IsString() @MaxLength(2000) metaToken?: string;
  @IsOptional() @IsString() @MaxLength(12000) googleCredentials?: string;
  @IsOptional() @IsInt() @Min(0) @Max(30) retainIpDays?: number;
  @IsOptional() @IsInt() @Min(7) @Max(365) retainEventsDays?: number;
}
export class AnalyticsSessionDto {
  @Matches(/^[a-zA-Z0-9.-]{16,64}$/) sessionId!: string;
  @Matches(/^[a-zA-Z0-9.-]{16,64}$/) visitorId!: string;
  @IsBoolean() analyticsConsent!: boolean;
  @IsBoolean() advertisingConsent!: boolean;
  @IsString() @MaxLength(500) path!: string;
  @IsOptional() @IsString() @MaxLength(500) referrer?: string;
  @IsOptional() @IsString() @MaxLength(150) source?: string;
  @IsOptional() @IsString() @MaxLength(100) medium?: string;
  @IsOptional() @IsString() @MaxLength(150) campaign?: string;
  @IsOptional() @IsString() @MaxLength(150) term?: string;
  @IsOptional() @Matches(/^[\d.]{3,100}$/) gaClientId?: string;
  @IsOptional() @Matches(/^\d{1,20}$/) gaSessionId?: string;
  @IsOptional()
  @Matches(/^fb\.\d\.\d+\.[a-zA-Z0-9_-]+$/)
  @MaxLength(150)
  fbp?: string;
  @IsOptional()
  @Matches(/^fb\.\d\.\d+\.[a-zA-Z0-9_-]+$/)
  @MaxLength(255)
  fbc?: string;
}
export class AnalyticsEventDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsItemDto)
  items?: AnalyticsItemDto[];
  @Matches(/^[a-zA-Z0-9.-]{16,64}$/) sessionId!: string;
  @IsUUID('4') eventId!: string;
  @IsIn([
    'page_view',
    'view_item',
    'add_to_cart',
    'remove_from_cart',
    'begin_checkout',
    'whatsapp_click',
    'form_start',
    'scroll',
  ])
  name!: string;
  @IsString() @MaxLength(500) path!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(10000000) value?: number;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsString() @MaxLength(100) itemId?: string;
  @IsOptional() @IsString() @MaxLength(100) itemName?: string;
}
