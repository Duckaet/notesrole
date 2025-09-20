// Define enums until Prisma client is generated
export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO'
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export interface User {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: Plan;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  authorId: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  token: string;
  status: InvitationStatus;
  tenantId: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantSlug: string;
}

export interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

export interface NoteFormData {
  title: string;
  content: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}