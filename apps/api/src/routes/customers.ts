import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1, 'வாடிக்கையாளர் பெயர் தேவை'),
  phone: z.string().regex(/^\+91\d{10}$/, 'தொலைபேசி எண் +91XXXXXXXXXX வடிவத்தில் இருக்க வேண்டும்').optional(),
  gstin: z.string().optional().nullable(),
  address: z.string().optional(),
});

// GET /customers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const { search, page = '1', limit = '20' } = req.query;

    let query = supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const from = (pageNum - 1) * limitNum;
    query = query.range(from, from + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to fetch customers');

    res.json({ data, total: count, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// GET /customers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (error || !data) throw new ApiError(404, 'NOT_FOUND', 'Customer not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /customers/:id/ledger
router.get('/:id/ledger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const from = (pageNum - 1) * limitNum;

    const { data, error, count } = await supabaseAdmin
      .from('ledger_entries')
      .select('*, invoices(invoice_no)', { count: 'exact' })
      .eq('customer_id', req.params.id)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .range(from, from + limitNum - 1);

    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to fetch ledger');
    res.json({ data, total: count, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// POST /customers
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const body = customerSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({ ...body, tenant_id, balance: 0 })
      .select()
      .single();

    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to create customer');
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /customers/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const body = customerSchema.partial().parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error || !data) throw new ApiError(404, 'NOT_FOUND', 'Customer not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /customers/:id/payment — record a payment (credit)
router.post('/:id/payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const paymentSchema = z.object({
      amount: z.number().positive('தொகை நேர்மறையாக இருக்க வேண்டும்'),
      note: z.string().optional(),
    });

    const { amount, note } = paymentSchema.parse(req.body);

    // Get customer current balance
    const { data: customer, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('balance')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (custErr || !customer) throw new ApiError(404, 'NOT_FOUND', 'Customer not found');

    const newBalance = customer.balance - amount;

    await Promise.all([
      supabaseAdmin
        .from('customers')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', req.params.id),
      supabaseAdmin.from('ledger_entries').insert({
        tenant_id,
        customer_id: req.params.id,
        type: 'credit',
        amount,
        note: note ?? 'Payment received',
      }),
    ]);

    res.json({ balance: newBalance, message: 'Payment recorded' });
  } catch (err) {
    next(err);
  }
});

export default router;
