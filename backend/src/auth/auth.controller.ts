import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Patch,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './authenticated-request';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenDto } from './dto/token.dto';
import { EmailDto } from './dto/email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CheckoutAccountDto } from './dto/checkout-account.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}
  private cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', 'false') === 'true',
      sameSite: 'lax' as const,
      path: '/',
      maxAge,
    };
  }
  private setCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie(
      this.config.get('COOKIE_ACCESS_NAME', 'lt_access'),
      accessToken,
      this.cookieOptions(15 * 60 * 1000),
    );
    response.cookie(
      this.config.get('COOKIE_REFRESH_NAME', 'lt_refresh'),
      refreshToken,
      this.cookieOptions(7 * 24 * 60 * 60 * 1000),
    );
  }
  private clearCookies(response: Response) {
    response.clearCookie(this.config.get('COOKIE_ACCESS_NAME', 'lt_access'), {
      path: '/',
    });
    response.clearCookie(this.config.get('COOKIE_REFRESH_NAME', 'lt_refresh'), {
      path: '/',
    });
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('email-status')
  emailStatus(@Body() dto: EmailDto) {
    return this.auth.emailStatus(dto.email);
  }

  @Post('checkout-account')
  async checkoutAccount(
    @Body() dto: CheckoutAccountDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.createCheckoutAccount(dto, {
      ipAddress,
      userAgent: request.header('user-agent'),
    });
    this.setCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user, passwordSetupSent: true };
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: TokenDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: EmailDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, {
      ipAddress,
      userAgent: request.header('user-agent'),
    });
    this.setCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }
  @Post('refresh')
  @ApiOperation({ summary: 'Rotar sesión' })
  async refresh(
    @Req() request: Request,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    const refreshCookieName = this.config.get<string>(
      'COOKIE_REFRESH_NAME',
      'lt_refresh',
    );
    const token = cookies[refreshCookieName];
    if (!token) throw new UnauthorizedException('Refresh token requerido');
    const result = await this.auth.refresh(token, {
      ipAddress,
      userAgent: request.header('user-agent'),
    });
    this.setCookies(response, result.accessToken, result.refreshToken);
    return { refreshed: true };
  }
  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.auth.sub);
  }
  @Patch('profile')
  @UseGuards(AuthGuard)
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(request.auth.sub, dto);
  }
  @Post('change-password')
  @UseGuards(AuthGuard)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      request.auth.sub,
      request.auth.sessionId,
      dto.currentPassword,
      dto.newPassword,
    );
  }
  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.auth.sessionId);
    this.clearCookies(response);
    return { loggedOut: true };
  }
  @Post('logout-all')
  @UseGuards(AuthGuard)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logoutAll(request.auth.sub);
    this.clearCookies(response);
    return { loggedOut: true };
  }
}
