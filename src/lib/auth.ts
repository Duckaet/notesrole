import { NextRequest } from 'next/server';
import { sign, verify } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload, Role } from '@/types';
import { prisma } from '@/lib/prisma';

export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export function generateJWT(payload: JWTPayload): string {
  const secret = getJWTSecret();
  return sign(payload, secret, {
    expiresIn: '24h', // Token expires in 24 hours
    issuer: 'notesrole-app',
    audience: 'notesrole-users',
  });
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const payload = verify(token, getJWTSecret(), {
      issuer: 'notesrole-app',
      audience: 'notesrole-users',
    }) as JWTPayload;
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function getCurrentUser(request: NextRequest): Promise<JWTPayload | null> {
  const token = getAuthToken(request);
  if (!token) {
    return null;
  }
  return verifyJWT(token);
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export interface AuthenticateUserParams {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  user: {
    id: string;
    email: string;
    role: Role;
    tenantId: string;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan: string;
  };
  token: string;
}

export async function authenticateUser(params: AuthenticateUserParams): Promise<AuthenticatedUser | null> {
  const { email, password } = params;

  try {
    // Find user with tenant information
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      console.log(`Authentication failed: User not found for email ${email}`);
      return null;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      console.log(`Authentication failed: Invalid password for email ${email}`);
      return null;
    }

    // Create JWT payload
    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
    };

    // Generate token
    const token = generateJWT(jwtPayload);

    console.log(`Authentication successful for user ${email} (${user.role}) in tenant ${user.tenant.slug}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        tenantId: user.tenantId,
      },
      tenant: {
        id: user.tenant.id,
        slug: user.tenant.slug,
        name: user.tenant.name,
        plan: user.tenant.plan,
      },
      token,
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = verify(token, getJWTSecret()) as { exp: number };
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true; // If we can't decode it, consider it expired
  }
}

export function getTokenExpirationTime(token: string): Date | null {
  try {
    const decoded = verify(token, getJWTSecret()) as { exp: number };
    return new Date(decoded.exp * 1000);
  } catch {
    return null;
  }
}