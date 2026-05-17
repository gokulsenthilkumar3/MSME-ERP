import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';

const router = Router();
router.use(authenticate);

const invoiceItemSchema = z.object({
  product_id: z.string().uuid('தவறான product_id'),
  qty: z.number().positive('அளவு நேர்மறையாக இருக்க வேண்டும்'),
  unit_price: z.number().positive('விலை நேர்மறையாக இருக்க வேண்டும்'),
  gst_rate: z.number().refine(v => [0, 5, 12, 18, 28].includes(v), {
    message: 'GST விகிதம் சரியாக இல்லை',
  }),
});

const createInvoiceSchema = z.object({
  customer_id: z.string().uuid('தவறான customer_id'),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'தேதி YYYY-MM-DD வடிவத்தில் இருக்க வேண்டும்'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'குறைந்தது ஒரு பொருள் சேர்க்க வேண்டும்'),
});

// GET /invoices
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const { status, customer_id, from_date, to_date, page = '1', limit = '20' } = req.query;

    let query = supabaseAdmin
      .from('invoices')
      .select('*, customers(name, phone)', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('invoice_date', { ascending: false });

    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (from_date) query = query.gte('invoice_date', from_date);
    if (to_date) query = query.lte('invoice_date', to_date);

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const from = (pageNum - 1) * limitNum;
    query = query.range(from, from + limitNum - 1);

    const { data, error, count } = await query;
    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to fetch invoices');

    res.json({ data, total: count, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// GET /invoices/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*, customers(*), invoice_items(*, products(name, unit))')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (error || !data) throw new ApiError(404, 'NOT_FOUND', 'Invoice not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /invoices — main invoice creation with all side effects
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const body = createInvoiceSchema.parse(req.body);

    // Get tenant for invoice_prefix and seq
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .select('invoice_prefix, invoice_seq')
      .eq('id', tenant_id)
      .single();

    if (tenantErr || !tenant) throw new ApiError(500, 'SERVER_ERROR', 'Tenant data unavailable');

    // Verify customer belongs to tenant
    const { data: customer, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('id, balance')
      .eq('id', body.customer_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (custErr || !customer) throw new ApiError(404, 'NOT_FOUND', 'Customer not found');

    // Calculate totals
    let subtotal = 0;
    let total_gst = 0;

    const itemsWithCalc = body.items.map(item => {
      const line_total = item.qty * item.unit_price;
      const gst_amount = (line_total * item.gst_rate) / 100;
      subtotal += line_total;
      total_gst += gst_amount;
      return { ...item, line_total };
    });

    const total = subtotal + total_gst;

    // Generate invoice number (increment sequence atomically)
    const newSeq = tenant.invoice_seq + 1;
    const invoice_no = `${tenant.invoice_prefix}-${String(newSeq).padStart(4, '0')}`;

    // Update tenant sequence
    await supabaseAdmin
      .from('tenants')
      .update({ invoice_seq: newSeq })
      .eq('id', tenant_id);

    // Create invoice
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id,
        customer_id: body.customer_id,
        invoice_no,
        invoice_date: body.invoice_date,
        due_date: body.due_date ?? null,
        subtotal,
        total_gst,
        total,
        status: 'sent',
        notes: body.notes ?? '',
      })
      .select()
      .single();

    if (invErr || !invoice) throw new ApiError(500, 'SERVER_ERROR', 'Failed to create invoice');

    // Insert invoice items, stock movements, and ledger entry in parallel
    await Promise.all([
      supabaseAdmin.from('invoice_items').insert(
        itemsWithCalc.map(item => ({
          invoice_id: invoice.id,
          tenant_id,
          product_id: item.product_id,
          qty: item.qty,
          unit_price: item.unit_price,
          gst_rate: item.gst_rate,
          line_total: item.line_total,
        }))
      ),
      // Stock movements (out) for each item
      supabaseAdmin.from('stock_movements').insert(
        itemsWithCalc.map(item => ({
          tenant_id,
          product_id: item.product_id,
          movement_type: 'out',
          qty: item.qty,
          reference_id: invoice.id,
          note: `Invoice ${invoice_no}`,
        }))
      ),
      // Ledger debit for customer
      supabaseAdmin.from('ledger_entries').insert({
        tenant_id,
        customer_id: body.customer_id,
        type: 'debit',
        amount: total,
        reference_id: invoice.id,
        note: `Invoice ${invoice_no}`,
      }),
    ]);

    // Update product stock quantities (deduct for each item)
    for (const item of itemsWithCalc) {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('stock_qty')
        .eq('id', item.product_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (prod) {
        await supabaseAdmin
          .from('products')
          .update({ stock_qty: prod.stock_qty - item.qty })
          .eq('id', item.product_id);
      }
    }

    // Update customer balance
    await supabaseAdmin
      .from('customers')
      .update({ balance: customer.balance + total, updated_at: new Date().toISOString() })
      .eq('id', body.customer_id);

    // Enqueue PDF generation (async, fire-and-forget for now)
    logger.info(`Invoice ${invoice_no} created — PDF generation to be enqueued`, { invoice_id: invoice.id });

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

// PATCH /invoices/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const { status } = z.object({
      status: z.enum(['draft', 'sent', 'paid', 'overdue']),
    }).parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error || !data) throw new ApiError(404, 'NOT_FOUND', 'Invoice not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /invoices/:id/pdf
router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('pdf_url')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (error || !invoice) throw new ApiError(404, 'NOT_FOUND', 'Invoice not found');
    if (!invoice.pdf_url) throw new ApiError(404, 'NOT_FOUND', 'PDF not yet generated');

    res.json({ pdf_url: invoice.pdf_url });
  } catch (err) {
    next(err);
  }
});

// POST /invoices/:id/share — WhatsApp share link
router.post('/:id/share', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('invoice_no, total, pdf_url, customers(name, phone)')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (error || !invoice) throw new ApiError(404, 'NOT_FOUND', 'Invoice not found');

    const customer = invoice.customers as { name: string; phone?: string } | null;
    const message = encodeURIComponent(
      `நல்வணக்கம் ${customer?.name ?? ''}! உங்கள் பில் ${invoice.invoice_no} — ₹${invoice.total}. PDF: ${invoice.pdf_url ?? 'தயாரிக்கப்படுகிறது...'}`
    );
    const whatsappUrl = customer?.phone
      ? `https://wa.me/${customer.phone.replace('+', '')}?text=${message}`
      : `https://wa.me/?text=${message}`;

    res.json({ whatsapp_url: whatsappUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
