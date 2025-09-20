import { prisma } from '@/lib/prisma';

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

export async function getDatabaseStats() {
  try {
    const [tenantCount, userCount, noteCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.note.count(),
    ]);

    return {
      tenants: tenantCount,
      users: userCount,
      notes: noteCount,
      connected: true,
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      tenants: 0,
      users: 0,
      notes: 0,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function initializeDatabase() {
  try {
    // Test connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to database');
    }

    console.log('Database connection established successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}