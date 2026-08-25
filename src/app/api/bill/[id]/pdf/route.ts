import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { mapOrder } from '@/lib/queries/mappers';
import { generateThermalBillPdf } from '@/lib/pdf/generateThermalBillPdf';
import { verifyBillToken } from '@/lib/billToken';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return new NextResponse('Order ID is required', { status: 400 });
    }
    if (!verifyBillToken(id, req.nextUrl.searchParams.get('token'))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return new NextResponse('Database client not configured', { status: 500 });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return new NextResponse('Order not found', { status: 404 });
    }

    const order = mapOrder(data);
    const pdfBytes = await generateThermalBillPdf(order);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Thermal-Bill-${id.slice(-4)}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('Error generating thermal bill PDF:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
