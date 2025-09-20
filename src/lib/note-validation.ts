/**
 * Note Validation Schemas
 * 
 * Comprehensive input validation for all note CRUD operations
 * Includes tenant validation, content validation, and security checks
 */

export interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface NoteQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  tags?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Validation functions
 */
export function validateCreateNote(data: unknown): { isValid: boolean; errors: string[]; data?: CreateNoteRequest } {
  const errors: string[] = [];

  // Type guard for data
  if (!data || typeof data !== 'object') {
    errors.push('Request body must be an object');
    return { isValid: false, errors };
  }

  const requestData = data as Record<string, unknown>;

  // Check required fields
  if (!requestData.title || typeof requestData.title !== 'string') {
    errors.push('Title is required and must be a string');
  } else if (requestData.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  } else if (requestData.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (!requestData.content || typeof requestData.content !== 'string') {
    errors.push('Content is required and must be a string');
  } else if (requestData.content.trim().length === 0) {
    errors.push('Content cannot be empty');
  } else if (requestData.content.length > 10000) {
    errors.push('Content must be 10,000 characters or less');
  }

  // Validate tags if provided
  if (requestData.tags !== undefined) {
    if (!Array.isArray(requestData.tags)) {
      errors.push('Tags must be an array');
    } else {
      if (requestData.tags.length > 10) {
        errors.push('Maximum 10 tags allowed');
      }
      for (const tag of requestData.tags) {
        if (typeof tag !== 'string') {
          errors.push('All tags must be strings');
          break;
        }
        if (tag.length > 50) {
          errors.push('Each tag must be 50 characters or less');
          break;
        }
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      title: (requestData.title as string).trim(),
      content: (requestData.content as string).trim(),
      tags: (requestData.tags as string[])?.map((tag: string) => tag.trim()) || []
    }
  };
}

export function validateUpdateNote(data: unknown): { isValid: boolean; errors: string[]; data?: UpdateNoteRequest } {
  const errors: string[] = [];

  // Type guard for data
  if (!data || typeof data !== 'object') {
    errors.push('Request body must be an object');
    return { isValid: false, errors };
  }

  const requestData = data as Record<string, unknown>;

  // At least one field must be provided for update
  if (!requestData.title && !requestData.content && !requestData.tags) {
    errors.push('At least one field (title, content, or tags) must be provided for update');
  }

  // Validate title if provided
  if (requestData.title !== undefined) {
    if (typeof requestData.title !== 'string') {
      errors.push('Title must be a string');
    } else if (requestData.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (requestData.title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }
  }

  // Validate content if provided
  if (requestData.content !== undefined) {
    if (typeof requestData.content !== 'string') {
      errors.push('Content must be a string');
    } else if (requestData.content.trim().length === 0) {
      errors.push('Content cannot be empty');
    } else if (requestData.content.length > 10000) {
      errors.push('Content must be 10,000 characters or less');
    }
  }

  // Validate tags if provided
  if (requestData.tags !== undefined) {
    if (!Array.isArray(requestData.tags)) {
      errors.push('Tags must be an array');
    } else {
      if (requestData.tags.length > 10) {
        errors.push('Maximum 10 tags allowed');
      }
      for (const tag of requestData.tags) {
        if (typeof tag !== 'string') {
          errors.push('All tags must be strings');
          break;
        }
        if (tag.length > 50) {
          errors.push('Each tag must be 50 characters or less');
          break;
        }
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const validatedData: UpdateNoteRequest = {};
  if (requestData.title !== undefined) validatedData.title = (requestData.title as string).trim();
  if (requestData.content !== undefined) validatedData.content = (requestData.content as string).trim();
  if (requestData.tags !== undefined) validatedData.tags = (requestData.tags as string[]).map((tag: string) => tag.trim());

  return {
    isValid: true,
    errors: [],
    data: validatedData
  };
}

export function validateNoteQueryParams(query: unknown): { isValid: boolean; errors: string[]; data?: NoteQueryParams } {
  const errors: string[] = [];
  const validatedQuery: NoteQueryParams = {};

  // Type guard for query
  if (!query || typeof query !== 'object') {
    return { isValid: true, errors: [], data: {} };
  }

  const queryData = query as Record<string, unknown>;

  // Validate page
  if (queryData.page !== undefined) {
    const page = parseInt(queryData.page as string);
    if (isNaN(page) || page < 1) {
      errors.push('Page must be a positive integer');
    } else {
      validatedQuery.page = queryData.page as string;
    }
  }

  // Validate limit
  if (queryData.limit !== undefined) {
    const limit = parseInt(queryData.limit as string);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    } else {
      validatedQuery.limit = queryData.limit as string;
    }
  }

  // Validate search
  if (queryData.search !== undefined) {
    if (typeof queryData.search !== 'string') {
      errors.push('Search must be a string');
    } else if (queryData.search.length > 200) {
      errors.push('Search query must be 200 characters or less');
    } else {
      validatedQuery.search = queryData.search;
    }
  }

  // Validate tags
  if (queryData.tags !== undefined) {
    if (typeof queryData.tags !== 'string') {
      errors.push('Tags filter must be a string');
    } else {
      validatedQuery.tags = queryData.tags;
    }
  }

  // Validate sortBy
  if (queryData.sortBy !== undefined) {
    const validSortFields = ['createdAt', 'updatedAt', 'title'];
    if (!validSortFields.includes(queryData.sortBy as string)) {
      errors.push('SortBy must be one of: createdAt, updatedAt, title');
    } else {
      validatedQuery.sortBy = queryData.sortBy as 'createdAt' | 'updatedAt' | 'title';
    }
  }

  // Validate sortOrder
  if (queryData.sortOrder !== undefined) {
    const validSortOrders = ['asc', 'desc'];
    if (!validSortOrders.includes(queryData.sortOrder as string)) {
      errors.push('SortOrder must be either asc or desc');
    } else {
      validatedQuery.sortOrder = queryData.sortOrder as 'asc' | 'desc';
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: validatedQuery
  };
}

/**
 * Security validation helpers
 */
export function sanitizeContent(content: string): string {
  // Basic HTML/XSS prevention - strips potentially dangerous characters
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function validateNoteId(id: string): boolean {
  // CUID format validation (used by Prisma @default(cuid()))
  // CUID format: c + base32 encoded timestamp + random characters
  const cuidRegex = /^c[a-z0-9]{24}$/i;
  return cuidRegex.test(id);
}