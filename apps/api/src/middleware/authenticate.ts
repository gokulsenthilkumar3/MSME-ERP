import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { ApiError } from './errorHandler';
import { logger } from '../lib/logger';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    phone: string;
    tenant_id: string;
    role: string;
  };
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT with Supabase Admin
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token');
    }

    // Lookup user record to get tenant_id and role
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role, name, phone')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User profile not found. Please complete onboarding.');
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      phone: userRecord.phone,
      tenant_id: userRecord.tenant_id,
      role: userRecord.role,
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
    } else {
      logger.error('Auth middleware error', { err });
      next(new ApiError(500, 'SERVER_ERROR', 'Authentication failed'));
    }
  }
}
