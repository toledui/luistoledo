export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  sessionId: string;
};
