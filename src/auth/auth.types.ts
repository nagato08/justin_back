import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
}
