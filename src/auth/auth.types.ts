import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string | null;
  role: UserRole;
  tokenVersion: number;
}
