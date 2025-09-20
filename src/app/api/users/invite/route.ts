import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserContextFromToken } from '@/lib/jwt';
import { Role, InvitationStatus } from '@/types';
import crypto from 'crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

// Validation schema for invitation request
const inviteRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER'] as const)
}).strict();

// Generate a secure random token for invitation
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Calculate expiration date (7 days from now)
function getExpirationDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

export async function POST(request: NextRequest) {
  try {
    // Get user context from JWT token
    const userContext = await getUserContextFromToken(request);
    
    if (!userContext) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is an admin
    if (userContext.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required. Only administrators can invite users.' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = inviteRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;

    // Check if user already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        tenantId: userContext.tenantId
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this organization' },
        { status: 409 }
      );
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        tenantId: userContext.tenantId,
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email address' },
        { status: 409 }
      );
    }

    // Get tenant to check limits
    const tenant = await prisma.tenant.findUnique({
      where: { id: userContext.tenantId }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check user limits based on subscription plan
    const currentUserCount = await prisma.user.count({
      where: { tenantId: userContext.tenantId }
    });

    const pendingInvitationCount = await prisma.invitation.count({
      where: {
        tenantId: userContext.tenantId,
        status: 'PENDING'
      }
    });

    const totalPotentialUsers = currentUserCount + pendingInvitationCount + 1; // +1 for this new invitation

    // FREE plan: limit to 5 users total
    if (tenant.plan === 'FREE' && totalPotentialUsers > 5) {
      return NextResponse.json(
        { 
          error: 'User limit exceeded',
          message: 'FREE plan allows up to 5 users. Upgrade to PRO for unlimited users.',
          currentUsers: currentUserCount,
          pendingInvitations: pendingInvitationCount,
          limit: 5
        },
        { status: 403 }
      );
    }

    // Generate invitation token and create invitation
    const token = generateInvitationToken();
    const expiresAt = getExpirationDate();

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: role as Role,
        token,
        status: 'PENDING' as InvitationStatus,
        tenantId: userContext.tenantId,
        invitedBy: userContext.userId,
        expiresAt
      },
      include: {
        tenant: {
          select: {
            name: true,
            slug: true
          }
        },
        inviter: {
          select: {
            email: true
          }
        }
      }
    });

    // In a real application, you would send an email here
    // For now, we'll return the invitation details including the token for testing
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/accept?token=${token}`;

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        tenantName: invitation.tenant.name,
        invitedBy: invitation.inviter.email,
        // Include token and link for testing purposes
        // In production, this would only be sent via email
        invitationToken: token,
        invitationLink
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list invitations (admin only)
export async function GET(request: NextRequest) {
  try {
    // Get user context from JWT token
    const userContext = await getUserContextFromToken(request);
    
    if (!userContext) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is an admin
    if (userContext.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as InvitationStatus | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Prisma.InvitationWhereInput = {
      tenantId: userContext.tenantId
    };

    if (status && ['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    // Get invitations with pagination
    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        include: {
          inviter: {
            select: {
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.invitation.count({ where })
    ]);

    return NextResponse.json({
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt,
        invitedBy: invitation.inviter.email
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}