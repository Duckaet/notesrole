/**
 * /api/notes/[id] - Individual Note Operations
 * 
 * GET /api/notes/[id] - Get a specific note
 * PUT /api/notes/[id] - Update a specific note
 * DELETE /api/notes/[id] - Delete a specific note
 * 
 * All operations include tenant isolation and proper authorization
 */

import { NextRequest } from 'next/server';
import { createApiResponse, createApiError, createValidationError, createNotFoundError } from '@/lib/api-response';
import { getUserContextFromToken } from '@/lib/jwt';
import { validateUpdateNote, validateNoteId } from '@/lib/note-validation';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notes/[id]
 * 
 * Retrieve a specific note with tenant isolation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user context from JWT token
    const context = getUserContextFromToken(request);
    
    if (!context || !context.userId || !context.tenantId) {
      return createApiError('Authentication required', 401);
    }

    const { id } = await params;

    // Validate note ID format
    if (!validateNoteId(id)) {
      return createValidationError('Invalid note ID format');
    }

    // Get note with tenant isolation
    const note = await prisma.note.findFirst({
      where: {
        id,
        tenantId: context.tenantId, // Ensure tenant isolation
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

    if (!note) {
      return createNotFoundError('Note');
    }

    return createApiResponse({
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        author: note.author,
      },
    }, 'Note retrieved successfully');

  } catch (error) {
    console.error('Error retrieving note:', error);
    return createApiError('Failed to retrieve note', 500);
  }
}

/**
 * PUT /api/notes/[id]
 * 
 * Update a specific note with tenant isolation and ownership validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user context from JWT token
    const context = getUserContextFromToken(request);
    
    if (!context || !context.userId || !context.tenantId) {
      return createApiError('Authentication required', 401);
    }

    const { id } = await params;

    // Validate note ID format
    if (!validateNoteId(id)) {
      return createValidationError('Invalid note ID format');
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return createValidationError('Invalid JSON in request body');
    }

    // Validate input
    const validation = validateUpdateNote(requestBody);
    if (!validation.isValid) {
      return createValidationError(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if note exists and user has permission to edit
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        tenantId: context.tenantId, // Ensure tenant isolation
      },
    });

    if (!existingNote) {
      return createNotFoundError('Note');
    }

    // Check ownership or admin role
    if (existingNote.authorId !== context.userId && context.role !== 'ADMIN') {
      return createApiError('You can only edit your own notes', 403);
    }

    // Update the note
    const updatedNote = await prisma.note.update({
      where: { id },
      data: validation.data!,
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

    return createApiResponse({
      note: {
        id: updatedNote.id,
        title: updatedNote.title,
        content: updatedNote.content,
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
        author: updatedNote.author,
      },
    }, 'Note updated successfully');

  } catch (error) {
    console.error('Error updating note:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to update not found')) {
        return createNotFoundError('Note');
      }
    }

    return createApiError('Failed to update note', 500);
  }
}

/**
 * DELETE /api/notes/[id]
 * 
 * Delete a specific note with tenant isolation and ownership validation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user context from JWT token
    const context = getUserContextFromToken(request);
    
    if (!context || !context.userId || !context.tenantId) {
      return createApiError('Authentication required', 401);
    }

    const { id } = await params;

    // Validate note ID format
    if (!validateNoteId(id)) {
      return createValidationError('Invalid note ID format');
    }

    // Check if note exists and user has permission to delete
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        tenantId: context.tenantId, // Ensure tenant isolation
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

    if (!existingNote) {
      return createNotFoundError('Note');
    }

    // Check ownership or admin role
    if (existingNote.authorId !== context.userId && context.role !== 'ADMIN') {
      return createApiError('You can only delete your own notes', 403);
    }

    // Delete the note
    await prisma.note.delete({
      where: { id },
    });

    // Get updated subscription status
    const { getSubscriptionStatus } = await import('@/lib/subscription');
    const subscriptionStatus = await getSubscriptionStatus(context.tenantId);

    const response = createApiResponse({
      deletedNote: {
        id: existingNote.id,
        title: existingNote.title,
        author: existingNote.author,
      },
      subscription: {
        plan: subscriptionStatus.plan,
        notesUsed: subscriptionStatus.usage.currentNotes,
        notesLimit: subscriptionStatus.limits.maxNotes,
        notesRemaining: subscriptionStatus.remaining.notes,
      },
    }, 'Note deleted successfully');

    // Add subscription headers
    response.headers.set('X-Subscription-Plan', subscriptionStatus.plan);
    response.headers.set('X-Notes-Used', subscriptionStatus.usage.currentNotes.toString());
    response.headers.set('X-Notes-Limit', subscriptionStatus.limits.maxNotes.toString());
    response.headers.set('X-Notes-Remaining', 
      subscriptionStatus.remaining.notes === Infinity ? 'unlimited' : subscriptionStatus.remaining.notes.toString()
    );

    return response;

  } catch (error) {
    console.error('Error deleting note:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to delete does not exist')) {
        return createNotFoundError('Note');
      }
    }

    return createApiError('Failed to delete note', 500);
  }
}