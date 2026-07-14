export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  profile?: {
    phone: string | null;
    whatsapp: string | null;
    birthDate: Date | null;
    country: string | null;
    state: string | null;
    city: string | null;
    postalCode: string | null;
    company: string | null;
    jobTitle: string | null;
    bio: string | null;
  } | null;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  sessionId: string;
};
