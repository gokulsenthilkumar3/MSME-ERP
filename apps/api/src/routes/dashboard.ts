import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /dashboard/summary — today's sales, invoice count, total dues
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const today = new Date().toISOString().split('T')[0];

    const [todayInvoices, allDues, lowStockCount] = await Promise.all([
      supabaseAdmin
        .from('invoices')
        .select('total, id')
        .eq('tenant_id', tenant_id)
        .eq('invoice_date', today),
      supabaseAdmin
        .from('customers')
        .select('balance')
        .eq('tenant_id', tenant_id)
        .gt('balance', 0),
      supabaseAdmin
        .from('products')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .filter('stock_qty', 'lt', 'low_stock_threshold'),
    ]);

    const today_sales = (todayInvoices.data ?? []).reduce((sum, inv) => sum + inv.total, 0);
    const today_invoice_count = todayInvoices.data?.length ?? 0;
    const total_dues = (allDues.data ?? []).reduce((sum, c) => sum + c.balance, 0);

    res.json({
      today_sales,
      today_invoice_count,
      total_dues,
      low_stock_count: lowStockCount.count ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/top-products
router.get('/top-products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string, 10);
    const fromDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('invoice_items')
      .select('product_id, line_total, qty, products(name, unit)')
      .eq('tenant_id', tenant_id)
      .gte('created_at', fromDate);

    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to fetch top products');

    // Aggregate by product
    const aggregated: Record<string, { name: string; unit: string; revenue: number; qty: number }> = {};
    for (const item of data ?? []) {
      const pid = item.product_id;
      if (!aggregated[pid]) {
        const prod = item.products as { name: string; unit: string } | null;
        aggregated[pid] = { name: prod?.name ?? '', unit: prod?.unit ?? '', revenue: 0, qty: 0 };
      }
      aggregated[pid].revenue += item.line_total;
      aggregated[pid].qty += item.qty;
    }

    const topProducts = Object.entries(aggregated)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({ data: topProducts, days: daysNum });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/top-customers
router.get('/top-customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('id, name, phone, balance')
      .eq('tenant_id', tenant_id)
      .order('balance', { ascending: false })
      .limit(5);

    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to fetch top customers');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/sales-trend — daily sales for last 30 days
router.get('/sales-trend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = (req as AuthenticatedRequest).user;
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('invoice_date, total')
      .eq('tenant_id', tenant_id)
      .gte('invoice_date', fromDate)
      .neq('status', 'draft')
      .order('invoice_date');

    if (error) throw new ApiError(500, 'SERVER_ERROR', 'Failed to fetch sales trend');

    // Aggregate by date
    const byDate: Record<string, number> = {};
    for (const inv of data ?? []) {
      byDate[inv.invoice_date] = (byDate[inv.invoice_date] ?? 0) + inv.total;
    }

    const trend = Object.entries(byDate).map(([date, total]) => ({ date, total }));
    res.json({ data: trend });
  } catch (err) {
    next(err);
  }
});

export default router;
