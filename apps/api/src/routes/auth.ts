import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAnon, supabaseAdmin } from '../lib/supabase';
import { ApiError } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';

const router = Router();

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/, 'Phone must be in format +91XXXXXXXXXX'),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/, 'Phone must be in format +91XXXXXXXXXX'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const onboardSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').optional(),
  address: z.string().optional(),
  language: z.enum(['ta', 'en', 'ml', 'bfq', 'iru', 'tcx', 'kfe', 'kur']).default('ta'),
  invoice_prefix: z.string().default('INV'),
});

// POST /auth/otp/send
router.post('/otp/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    const { error } = await supabaseAnon.auth.signInWithOtp({ phone });
    if (error) throw new ApiError(400, 'AUTH_ERROR', error.message);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    next(err);
  }
});

// POST /auth/otp/verify
router.post('/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);

    const { data, error } = await supabaseAnon.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });

    if (error || !data.session) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired OTP');
    }

    const userId = data.user!.id;

    // Check if user profile exists
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, name')
      .eq('id', userId)
      .single();

    res.json({
      token: data.session.access_token,
      is_new: !userRecord,
      user: {
        id: userId,
        phone,
        tenant_id: userRecord?.tenant_id ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/onboard — create tenant + user record after first login
router.post('/onboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Missing token');
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token');

    // Check not already onboarded
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) throw new ApiError(409, 'CONFLICT', 'User already onboarded');

    const body = onboardSchema.parse(req.body);

    // Create tenant
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: body.name,
        gstin: body.gstin ?? null,
        address: body.address ?? '',
        phone: user.phone ?? '',
        language: body.language,
        invoice_prefix: body.invoice_prefix,
        invoice_seq: 0,
        plan: 'free',
      })
      .select()
      .single();

    if (tenantErr) throw new ApiError(500, 'SERVER_ERROR', 'Failed to create tenant');

    // Create user record
    const { error: userErr } = await supabaseAdmin.from('users').insert({
      id: user.id,
      tenant_id: tenant.id,
      phone: user.phone ?? '',
      name: body.name,
      role: 'owner',
    });

    if (userErr) throw new ApiError(500, 'SERVER_ERROR', 'Failed to create user profile');

    res.status(201).json({ tenant_id: tenant.id, message: 'Onboarding complete' });
  } catch (err) {
    next(err);
  }
});

// GET /me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id, id } = (req as AuthenticatedRequest).user;

    const [userResult, tenantResult] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('id', id).single(),
      supabaseAdmin.from('tenants').select('*').eq('id', tenant_id).single(),
    ]);

    if (userResult.error) throw new ApiError(404, 'NOT_FOUND', 'User not found');
    if (tenantResult.error) throw new ApiError(404, 'NOT_FOUND', 'Tenant not found');

    res.json({ user: userResult.data, tenant: tenantResult.data });
  } catch (err) {
    next(err);
  }
});

// PATCH /me/tenant
router.patch('/me/tenant', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      gstin: z.string().optional().nullable(),
      address: z.string().optional(),
      language: z.enum(['ta', 'en', 'ml', 'bfq', 'iru', 'tcx', 'kfe', 'kur']).optional(),
      invoice_prefix: z.string().optional(),
    });

    const updates = updateSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tenant_id)
      .select()
      .single();

    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to update tenant');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
