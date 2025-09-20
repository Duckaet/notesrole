import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle CORS for all requests
  const response = NextResponse.next();
  
  // Configure CORS headers
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = request.headers.get('origin');
  
  if (origin && corsOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (corsOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-slug');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers });
  }
  
  // Skip middleware for static files only
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|css|js|ico|woff|woff2|ttf|eot)$/)
  ) {
    return response;
  }

  // Skip auth for login page, public API routes, and health check
  if (pathname === '/login' || pathname === '/api/auth/login' || pathname === '/api/auth/verify' || pathname === '/api/health') {
    return response;
  }

  // Handle API routes - extract JWT and add user context headers
  if (pathname.startsWith('/api')) {
    console.log('🔧 Middleware processing API route:', pathname);
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('🔑 Token found:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('❌ No token provided for API route');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: response.headers }
      );
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      console.log('✅ Token decoded successfully:', decoded.email);
      
      // Add user context headers to the existing response
      response.headers.set('x-user-id', decoded.userId);
      response.headers.set('x-user-email', decoded.email);
      response.headers.set('x-user-role', decoded.role);
      response.headers.set('x-tenant-id', decoded.tenantId);
      response.headers.set('x-tenant-slug', decoded.tenantSlug);
      console.log('📋 Added user context headers to response');
      
      return response;
    } catch {
      console.log('❌ Invalid token for API route');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: response.headers }
      );
    }
  }

  // Handle frontend routes - check if user is authenticated
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return response;
  } catch {
    // Clear invalid token and redirect to login
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
    redirectResponse.cookies.delete('auth_token');
    // Copy CORS headers to redirect response
    response.headers.forEach((value, key) => {
      if (key.startsWith('access-control-')) {
        redirectResponse.headers.set(key, value);
      }
    });
    return redirectResponse;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};