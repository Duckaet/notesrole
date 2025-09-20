import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvitationStatus, Role } from '@/types';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation schema for accepting invitation
const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = acceptInvitationSchema.safeParse(body);
    
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

    const { token, password } = validationResult.data;

    // Find the invitation by token
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: 'PENDING'
      },
      include: {
        tenant: true
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    if (invitation.expiresAt < now) {
      // Mark invitation as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' as InvitationStatus }
      });

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check if user already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        email: invitation.email,
        tenantId: invitation.tenantId
      }
    });

    if (existingUser) {
      // Mark invitation as accepted if user already exists
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { 
          status: 'ACCEPTED' as InvitationStatus,
          acceptedAt: now
        }
      });

      return NextResponse.json(
        { error: 'User already exists in this organization' },
        { status: 409 }
      );
    }

    // Check tenant user limits
    const currentUserCount = await prisma.user.count({
      where: { tenantId: invitation.tenantId }
    });

    // FREE plan: limit to 5 users total
    if (invitation.tenant.plan === 'FREE' && currentUserCount >= 5) {
      return NextResponse.json(
        { 
          error: 'User limit exceeded',
          message: 'This organization has reached its user limit. Please contact an administrator to upgrade the plan.',
          currentUsers: currentUserCount,
          limit: 5
        },
        { status: 403 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user and update invitation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          password: hashedPassword,
          role: invitation.role as Role,
          tenantId: invitation.tenantId
        }
      });

      // Update the invitation status
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED' as InvitationStatus,
          acceptedAt: now
        }
      });

      return newUser;
    });

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
        tenantId: result.tenantId,
        tenantName: invitation.tenant.name,
        tenantSlug: invitation.tenant.slug
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to validate invitation token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the invitation by token
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: 'PENDING'
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

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    if (invitation.expiresAt < now) {
      // Mark invitation as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' as InvitationStatus }
      });

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: invitation.email,
        tenantId: invitation.tenantId
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this organization' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        tenantName: invitation.tenant.name,
        invitedBy: invitation.inviter.email,
        expiresAt: invitation.expiresAt
      }
    });

  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}