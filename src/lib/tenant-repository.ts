import { prisma } from '@/lib/prisma';
import { Role, Plan } from '@/types';

export class TenantAwareRepository {
  constructor(private tenantId: string) {}

  // User operations
  async findUserById(userId: string) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: this.tenantId,
      },
      include: {
        tenant: true,
      },
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        tenantId: this.tenantId,
      },
      include: {
        tenant: true,
      },
    });
  }

  async createUser(data: {
    email: string;
    password: string;
    role: Role;
  }) {
    return prisma.user.create({
      data: {
        ...data,
        tenantId: this.tenantId,
      },
      include: {
        tenant: true,
      },
    });
  }

  async updateUser(userId: string, data: Partial<{
    email: string;
    password: string;
    role: Role;
  }>) {
    return prisma.user.update({
      where: {
        id: userId,
        tenantId: this.tenantId,
      },
      data,
      include: {
        tenant: true,
      },
    });
  }

  async deleteUser(userId: string) {
    return prisma.user.delete({
      where: {
        id: userId,
        tenantId: this.tenantId,
      },
    });
  }

  async listUsers(options?: {
    skip?: number;
    take?: number;
    role?: Role;
  }) {
    const { skip = 0, take = 50, role } = options || {};
    
    return prisma.user.findMany({
      where: {
        tenantId: this.tenantId,
        ...(role && { role }),
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        tenant: true,
      },
    });
  }

  // Note operations
  async findNoteById(noteId: string) {
    return prisma.note.findFirst({
      where: {
        id: noteId,
        tenantId: this.tenantId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        tenant: true,
      },
    });
  }

  async createNote(data: {
    title: string;
    content: string;
    authorId: string;
  }) {
    // Verify author belongs to tenant
    const author = await this.findUserById(data.authorId);
    if (!author) {
      throw new Error('Author not found or does not belong to tenant');
    }

    return prisma.note.create({
      data: {
        ...data,
        tenantId: this.tenantId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        tenant: true,
      },
    });
  }

  async updateNote(noteId: string, data: Partial<{
    title: string;
    content: string;
  }>) {
    return prisma.note.update({
      where: {
        id: noteId,
        tenantId: this.tenantId,
      },
      data,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        tenant: true,
      },
    });
  }

  async deleteNote(noteId: string) {
    return prisma.note.delete({
      where: {
        id: noteId,
        tenantId: this.tenantId,
      },
    });
  }

  async listNotes(options?: {
    skip?: number;
    take?: number;
    authorId?: string;
  }) {
    const { skip = 0, take = 50, authorId } = options || {};
    
    return prisma.note.findMany({
      where: {
        tenantId: this.tenantId,
        ...(authorId && { authorId }),
      },
      skip,
      take,
      orderBy: {
        updatedAt: 'desc',
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
  }

  async countNotes(authorId?: string) {
    return prisma.note.count({
      where: {
        tenantId: this.tenantId,
        ...(authorId && { authorId }),
      },
    });
  }

  async listUserNotes(userId: string, options?: {
    skip?: number;
    take?: number;
  }) {
    // Verify user belongs to tenant
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('User not found or does not belong to tenant');
    }

    return this.listNotes({
      ...options,
      authorId: userId,
    });
  }

  // Tenant operations
  async getTenant() {
    return prisma.tenant.findUnique({
      where: {
        id: this.tenantId,
      },
    });
  }

  async updateTenant(data: Partial<{
    name: string;
    plan: Plan;
  }>) {
    return prisma.tenant.update({
      where: {
        id: this.tenantId,
      },
      data,
    });
  }

  async upgradeTenant() {
    return this.updateTenant({ plan: Plan.PRO });
  }

  // Subscription and limits
  async canCreateNote(): Promise<boolean> {
    const tenant = await this.getTenant();
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.plan === Plan.PRO) {
      return true;
    }

    // For FREE plan, check note count limit
    const noteCount = await this.countNotes();
    return noteCount < 3; // FREE plan limit
  }

  async getRemainingNotes(): Promise<number> {
    const tenant = await this.getTenant();
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.plan === Plan.PRO) {
      return Infinity;
    }

    const noteCount = await this.countNotes();
    return Math.max(0, 3 - noteCount); // FREE plan limit
  }
}

// Factory function to create tenant-aware repository
export function createTenantRepository(tenantId: string): TenantAwareRepository {
  return new TenantAwareRepository(tenantId);
}

// Helper function to get repository from request headers (for API routes)
export function getRepositoryFromHeaders(headers: Headers): TenantAwareRepository {
  const tenantId = headers.get('x-tenant-id');
  if (!tenantId) {
    throw new Error('Tenant ID not found in request headers');
  }
  return createTenantRepository(tenantId);
}