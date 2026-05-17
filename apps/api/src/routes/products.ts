import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const VALID_GST_RATES = [0, 5, 12, 18, 28];

const productSchema = z.object({
  name: z.string().min(1, 'பொருளின் பெயர் தேவை'),
  sku: z.string().min(1, 'SKU தேவை'),
  unit: z.enum(['pcs', 'kg', 'litre', 'box', 'pack', 'set']),
  price: z.number().positive('விலை நேர்மறையாக இருக்க வேண்டும்'),
  gst_rate: z.number().refine(v => VALID_GST_RATES.includes(v), {
    message: 'GST விகிதம் 0, 5, 12, 18 அல்லது 28 ஆக இருக்க வேண்டும்',
  }),
  hsn_code: z.string().optional(),
  stock_qty: z.number().min(0).default(0),
  low_stock_threshold: z.number().min(0).default(10),
});

// GET /products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const { search, page = '1', limit = '20' } = req.query;

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const from = (pageNum - 1) * limitNum;
    query = query.range(from, from + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to fetch products');

    res.json({ data, total: count, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// GET /products/low-stock
router.get('/low-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .filter('stock_qty', 'lt', 'low_stock_threshold');

    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to fetch low-stock products');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /products/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (error || !data) throw new ApiError(404, 'NOT_FOUND', 'Product not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /products
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const body = productSchema.parse(req.body);

    // Check duplicate SKU
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('sku', body.sku)
      .single();

    if (existing) throw new ApiError(409, 'CONFLICT', 'SKU already exists', 'sku');

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({ ...body, tenant_id, is_active: true })
      .select()
      .single();

    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to create product');
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const body = productSchema.partial().parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error || !data) throw new ApiError(404, 'NOT_FOUND', 'Product not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /products/:id (soft delete)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const { error } = await supabaseAdmin
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id);

    if (error) throw new ApiError(404, 'NOT_FOUND', 'Product not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /products/:id/stock — manual stock adjustment
router.post('/:id/stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const stockSchema = z.object({
      movement_type: z.enum(['in', 'out', 'adjustment']),
      qty: z.number().positive(),
      note: z.string().optional(),
    });

    const { movement_type, qty, note } = stockSchema.parse(req.body);

    // Get current product
    const { data: product, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('stock_qty')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (prodErr || !product) throw new ApiError(404, 'NOT_FOUND', 'Product not found');

    const newQty =
      movement_type === 'in'
        ? product.stock_qty + qty
        : movement_type === 'out'
        ? product.stock_qty - qty
        : qty; // adjustment sets absolute value

    if (newQty < 0) throw new ApiError(422, 'VALIDATION_ERROR', 'Stock cannot go below 0', 'qty');

    // Update stock and insert movement record
    await Promise.all([
      supabaseAdmin
        .from('products')
        .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
        .eq('id', req.params.id),
      supabaseAdmin.from('stock_movements').insert({
        tenant_id,
        product_id: req.params.id,
        movement_type,
        qty,
        note: note ?? '',
      }),
    ]);

    res.json({ stock_qty: newQty });
  } catch (err) {
    next(err);
  }
});

export default router;
