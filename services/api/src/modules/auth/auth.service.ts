import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getAccessToken(code: string): Promise<string> {
    // If APP_ACCESS_TOKEN is configured, verify the code matches it.
    // This prevents arbitrary JWT minting when authentication is enabled.
    const expectedToken = this.configService.get<string>("app.accessToken");
    if (expectedToken && code !== expectedToken) {
      throw new UnauthorizedException("Invalid access token");
    }

    const payload = {
      sub: code,
      jti: randomUUID(),
      iss: "ai-novel-diagnosis",
      aud: "ai-novel-diagnosis-client",
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      algorithm: "HS256",
    });
  }

  async refreshAccessToken(token: string): Promise<string> {
    try {
      const payload = this.jwtService.verify(token, {
        algorithms: ["HS256"],
        // Do NOT ignore expiration by default — tokens must be valid.
        // Callers who need grace-period refresh should use a separate endpoint.
        ignoreExpiration: false,
      });

      // Strip JWT metadata fields, keep only business claims
      const {
        iat: _iat,
        exp: _exp,
        nbf: _nbf,
        jti: _jti,
        ...cleanPayload
      } = payload;

      return this.jwtService.sign(
        {
          ...cleanPayload,
          jti: randomUUID(),
          iat: Math.floor(Date.now() / 1000),
        },
        { algorithm: "HS256" },
      );
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  verifyAccessToken(token: string): unknown {
    return this.jwtService.verify(token, {
      algorithms: ["HS256"],
    });
  }
}
