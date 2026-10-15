import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { PermissionsGuard } from './permissions.guard';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, ApiKeysController],
  providers: [AuthService, AuthGuard, PermissionsGuard, ApiKeysService],
  exports: [
    AuthService,
    AuthGuard,
    PermissionsGuard,
    ApiKeysService,
    JwtModule,
  ],
})
export class AuthModule {}
