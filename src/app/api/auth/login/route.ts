import { NextRequest } from 'next/server';
import { createApiResponse, createApiError, createValidationError } from '@/lib/api-response';
import { authenticateUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { email, password } = body;
    
    if (!email || !password) {
      return createValidationError('Email and password are required');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return createValidationError('Email and password must be strings');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createValidationError('Invalid email format');
    }

    // Validate password length
    if (password.length < 1) {
      return createValidationError('Password cannot be empty');
    }

    console.log(`Login attempt for email: ${email}`);

    // Authenticate user
    const authResult = await authenticateUser({ email, password });

    if (!authResult) {
      return createApiError('Invalid email or password', 401);
    }

    console.log(`Login successful for ${email}`);

    return createApiResponse({
      message: 'Login successful',
      user: authResult.user,
      tenant: authResult.tenant,
      token: authResult.token,
      expiresIn: '24h',
    });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof SyntaxError) {
      return createValidationError('Invalid JSON in request body');
    }

    return createApiError('Internal server error during login', 500);
  }
}