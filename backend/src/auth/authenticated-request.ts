import type { Request } from 'express';
import type { AccessTokenPayload } from './auth.types';
export type AuthenticatedRequest = Request & { auth: AccessTokenPayload };
