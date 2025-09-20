import { JWTPayload } from '@/types';
import { generateJWT, verifyJWT, isTokenExpired } from '@/lib/auth';

export interface SessionInfo {
  user: JWTPayload;
  token: string;
  expiresAt: Date;
  isValid: boolean;
}

export class SessionManager {
  private static TOKEN_REFRESH_THRESHOLD = 2 * 60 * 60; // 2 hours before expiry

  /**
   * Create a new session with JWT token
   */
  static createSession(user: JWTPayload): { token: string; expiresAt: Date } {
    const token = generateJWT(user);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    return { token, expiresAt };
  }

  /**
   * Validate an existing session
   */
  static async validateSession(token: string): Promise<SessionInfo | null> {
    try {
      if (isTokenExpired(token)) {
        return null;
      }

      const user = await verifyJWT(token);
      if (!user) {
        return null;
      }

      // Calculate expiration time (JWT exp is in seconds, we need milliseconds)
      const decoded = await verifyJWT(token);
      if (!decoded) {
        return null;
      }

      return {
        user: decoded,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Approximate, since we can't get exact exp from JWT easily
        isValid: true,
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Check if token needs to be refreshed
   */
  static shouldRefreshToken(token: string): boolean {
    try {
      const decoded = verifyJWT(token);
      if (!decoded) {
        return false;
      }

      // Check if token expires within the refresh threshold
      const expirationTime = Date.now() + (this.TOKEN_REFRESH_THRESHOLD * 1000);
      const currentTime = Date.now();
      
      return expirationTime - currentTime < this.TOKEN_REFRESH_THRESHOLD * 1000;
    } catch {
      return false;
    }
  }

  /**
   * Refresh a token if it's still valid but close to expiry
   */
  static async refreshToken(token: string): Promise<{ token: string; expiresAt: Date } | null> {
    try {
      const session = await this.validateSession(token);
      if (!session || !session.isValid) {
        return null;
      }

      // Create new token with same user info
      return this.createSession(session.user);

    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Invalidate a session (for logout)
   * Note: With JWT, we can't truly invalidate server-side without a blacklist
   * This is mainly for client-side session cleanup
   */
  static invalidateSession(token: string): boolean {
    try {
      // In a production system, you might want to add the token to a blacklist
      // For now, we'll just validate that it's a proper token format
      const user = verifyJWT(token);
      return user !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get session remaining time
   */
  static async getSessionRemainingTime(token: string): Promise<number> {
    try {
      const session = await this.validateSession(token);
      if (!session) {
        return 0;
      }

      const currentTime = Date.now();
      const expirationTime = session.expiresAt.getTime();
      
      return Math.max(0, expirationTime - currentTime);
    } catch {
      return 0;
    }
  }
}

// Utility functions for easier use in API routes
export async function validateRequestSession(authHeader: string | null): Promise<JWTPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const session = await SessionManager.validateSession(token);
  
  return session?.user || null;
}

export function createAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: JWTPayload;
  expiresAt?: string;
  error?: string;
}