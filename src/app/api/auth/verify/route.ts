/**
 * Auth Verification API Route
 * 
 * Verifies JWT tokens to check if they're still valid.
 * Used by the frontend to validate stored tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No token provided' 
        },
        { status: 401 }
      );
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        decoded
      }
    });

  } catch {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid token' 
      },
      { status: 401 }
    );
  }
}