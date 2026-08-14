import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("mock-token"),
            verify: jest.fn().mockReturnValue({ sub: "test-user" }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            // APP_ACCESS_TOKEN unset → any code is accepted
            get: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  describe("getAccessToken", () => {
    it("should sign a token with structured claims from code", async () => {
      const result = await authService.getAccessToken("auth-code-123");

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "auth-code-123",
          iss: "ai-novel-diagnosis",
          aud: "ai-novel-diagnosis-client",
          jti: expect.any(String) as unknown as string,
          iat: expect.any(Number) as unknown as number,
        }),
        { algorithm: "HS256" },
      );
      expect(result).toBe("mock-token");
    });

    it("should reject the code when APP_ACCESS_TOKEN is configured and mismatches", async () => {
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: JwtService,
            useValue: { sign: jest.fn(), verify: jest.fn() },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) =>
                key === "app.accessToken" ? "secret-token" : undefined,
              ),
            },
          },
        ],
      }).compile();
      const guarded = module.get(AuthService);

      await expect(guarded.getAccessToken("wrong-code")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should verify without ignoring expiration and re-sign with clean payload", async () => {
      jest.spyOn(jwtService, "verify").mockReturnValue({
        sub: "test-user",
        iat: 1000,
        exp: 2000,
        jti: "old-jti",
        iss: "ai-novel-diagnosis",
        aud: "ai-novel-diagnosis-client",
      } as never);

      const result = await authService.refreshAccessToken("old-token");

      expect(jwtService.verify).toHaveBeenCalledWith("old-token", {
        algorithms: ["HS256"],
        ignoreExpiration: false,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "test-user",
          iss: "ai-novel-diagnosis",
          aud: "ai-novel-diagnosis-client",
          jti: expect.any(String) as unknown as string,
          iat: expect.any(Number) as unknown as number,
        }),
        { algorithm: "HS256" },
      );
      expect(result).toBe("mock-token");
    });

    it("should throw UnauthorizedException when verify throws", async () => {
      jest.spyOn(jwtService, "verify").mockImplementation(() => {
        throw new Error("invalid token");
      });

      await expect(authService.refreshAccessToken("bad-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify with HS256 and return the payload", () => {
      const result = authService.verifyAccessToken("valid-token");

      expect(jwtService.verify).toHaveBeenCalledWith("valid-token", {
        algorithms: ["HS256"],
      });
      expect(result).toEqual({ sub: "test-user" });
    });
  });
});
