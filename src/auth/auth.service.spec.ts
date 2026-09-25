import { UnauthorizedException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const user = {
    id: "user-1",
    email: "admin@example.com",
    displayName: "Administratrice",
    role: UserRole.ADMIN,
    isActive: true,
    passwordHash: "",
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("retourne un jeton et le profil avec des identifiants valides", async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...user,
          passwordHash: await hash("mot-de-passe-solide", 4),
        }),
        update: jest.fn().mockResolvedValue(user),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue("jwt-token") };
    const service = new AuthService(
      prisma as never,
      jwt as never,
      { get: jest.fn() } as never,
    );

    const result = await service.login({
      email: " ADMIN@EXAMPLE.COM ",
      password: "mot-de-passe-solide",
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
    });
    expect(result.accessToken).toBe("jwt-token");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { lastLoginAt: expect.any(Date) as Date },
    });
  });

  it("refuse un mot de passe incorrect sans révéler la cause", async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...user,
          passwordHash: await hash("bon-mot-de-passe", 4),
        }),
      },
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      { get: jest.fn() } as never,
    );

    await expect(
      service.login({
        email: user.email,
        password: "mauvais-mot-de-passe",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("refuse un compte désactivé", async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...user,
          isActive: false,
          passwordHash: await hash("mot-de-passe-solide", 4),
        }),
      },
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      { get: jest.fn() } as never,
    );

    await expect(
      service.login({
        email: user.email,
        password: "mot-de-passe-solide",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
  it("crée un compte client et ouvre une session", async () => {
    const prisma = {
      user: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: "customer-1",
            ...data,
            tokenVersion: 0,
            isActive: true,
          }),
        ),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue("customer-token") };
    const service = new AuthService(
      prisma as never,
      jwt as never,
      { get: jest.fn() } as never,
    );

    const result = await service.register({
      email: " CLIENT@EXAMPLE.COM ",
      displayName: " Client Test ",
      password: "mot-de-passe-client-solide",
    });

    expect(result.user.role).toBe(UserRole.CUSTOMER);
    expect(result.accessToken).toBe("customer-token");
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "client@example.com",
        displayName: "Client Test",
        role: UserRole.CUSTOMER,
      }) as object,
    });
  });
});
