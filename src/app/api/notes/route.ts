/**
 * POST /api/notes
 * 
 * Create a new note with tenant isolation and subscription limit validation
 */

import { NextRequest } from 'next/server';
import { createApiResponse, createApiError, createValidationError } from '@/lib/api-response';
import { getUserContextFromToken } from '@/lib/jwt';
import { validateCreateNote, validateNoteQueryParams } from '@/lib/note-validation';
import { validateNoteCreation } from '@/lib/subscription-middleware';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Get user context from JWT token
    const context = getUserContextFromToken(request);
    
    if (!context || !context.userId || !context.tenantId) {
      return createApiError('Authentication required', 401);
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return createValidationError('Invalid JSON in request body');
    }

    // Validate input
    const validation = validateCreateNote(requestBody);
    if (!validation.isValid) {
      return createValidationError(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { title, content } = validation.data!;
    // Note: tags are not supported in current schema, removed from validation

    // Check subscription limits before creating note
    try {
      await validateNoteCreation(context.tenantId);
    } catch (error) {
      return createApiError(
        error instanceof Error ? error.message : 'Subscription limit exceeded',
        403
      );
    }

    // Create the note with tenant isolation
    const note = await prisma.note.create({
      data: {
        title,
        content,
        tenantId: context.tenantId,
        authorId: context.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Get updated subscription status for response headers
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const subscriptionStatus = await getSubscriptionStatus(context.tenantId);

    // Create response with subscription headers
    const response = createApiResponse(
      {
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          author: note.author,
        },
        subscription: {
          plan: subscriptionStatus.plan,
          notesUsed: subscriptionStatus.usage.currentNotes,
          notesLimit: subscriptionStatus.limits.maxNotes,
          notesRemaining: subscriptionStatus.remaining.notes,
        },
      },
      'Note created successfully',
      201
    );

    // Add subscription headers
    response.headers.set('X-Subscription-Plan', subscriptionStatus.plan);
    response.headers.set('X-Notes-Used', subscriptionStatus.usage.currentNotes.toString());
    response.headers.set('X-Notes-Limit', subscriptionStatus.limits.maxNotes.toString());
    response.headers.set('X-Notes-Remaining', 
      subscriptionStatus.remaining.notes === Infinity ? 'unlimited' : subscriptionStatus.remaining.notes.toString()
    );

    return response;

  } catch (error) {
    console.error('Error creating note:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return createApiError('A note with this title already exists', 409);
      }
      if (error.message.includes('Foreign key constraint')) {
        return createApiError('Invalid tenant or user reference', 400);
      }
    }

    return createApiError('Failed to create note', 500);
  }
}

/**
 * GET /api/notes
 * 
 * List notes with tenant isolation, pagination, and search
 */
export async function GET(request: NextRequest) {
  try {
    // Get user context from JWT token
    const context = getUserContextFromToken(request);
    
    if (!context || !context.userId || !context.tenantId) {
      return createApiError('Authentication required', 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = validateNoteQueryParams(Object.fromEntries(searchParams));
    
    if (!queryValidation.isValid) {
      return createValidationError(`Query validation failed: ${queryValidation.errors.join(', ')}`);
    }

    const {
      page = '1',
      limit = '10',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = queryValidation.data || {};

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with tenant isolation
    const where: Prisma.NoteWhereInput = {
      tenantId: context.tenantId,
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build order by clause
    const orderBy: Prisma.NoteOrderByWithRelationInput = {};
    orderBy[sortBy as keyof Prisma.NoteOrderByWithRelationInput] = sortOrder;

    // Get notes with pagination
    const [notes, totalCount] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.note.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Get subscription status for response headers
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const subscriptionStatus = await getSubscriptionStatus(context.tenantId);

    const response = createApiResponse({
      notes: notes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        author: note.author,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      subscription: {
        plan: subscriptionStatus.plan,
        notesUsed: subscriptionStatus.usage.currentNotes,
        notesLimit: subscriptionStatus.limits.maxNotes,
        notesRemaining: subscriptionStatus.remaining.notes,
      },
    }, 'Notes retrieved successfully');

    // Add subscription headers
    response.headers.set('X-Subscription-Plan', subscriptionStatus.plan);
    response.headers.set('X-Notes-Used', subscriptionStatus.usage.currentNotes.toString());
    response.headers.set('X-Notes-Limit', subscriptionStatus.limits.maxNotes.toString());
    response.headers.set('X-Notes-Remaining', 
      subscriptionStatus.remaining.notes === Infinity ? 'unlimited' : subscriptionStatus.remaining.notes.toString()
    );

    return response;

  } catch (error) {
    console.error('Error retrieving notes:', error);
    return createApiError('Failed to retrieve notes', 500);
  }
}