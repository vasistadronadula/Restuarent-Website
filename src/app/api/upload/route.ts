import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireStaff, authErrorResponse } from '@/lib/auth/apiAuth';
import { rateLimit, clientIp } from '@/lib/auth/rateLimit';
import { log } from '@/lib/logger';

const BUCKET_NAME = 'menu-images';
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Only the formats the menu actually renders. An allow-list rather than a
 * `image/*` prefix test: `image/svg+xml` passes that test and an SVG served
 * from a public bucket on the app's own origin is a script-execution vector.
 */
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/**
 * POST /api/upload — staff-only image upload for menu/category artwork.
 *
 * This endpoint holds the service-role key and writes to a public bucket, so
 * an unauthenticated version of it is an open write handle on the project's
 * storage: anyone who found the URL could exhaust the quota or park arbitrary
 * images under the restaurant's own domain. Its only caller is the admin
 * image field (components/admin/form-fields), which is behind AdminGuard —
 * but a client-side guard decides what to render, never what the server will
 * accept, so the check has to be here too.
 */
export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
  } catch (err) {
    const { body, status } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  // Second line behind the auth check: a compromised or careless staff
  // session still can't be used to fill the bucket in a loop.
  const limit = rateLimit(`upload:ip:${clientIp(request)}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawFolder = (formData.get('folder') as string) || 'dishes';
    // Never let the caller steer the storage path — `../` or a leading slash
    // here would write outside the intended prefix.
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'dishes';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'File must be a PNG, JPG, WEBP, AVIF or GIF image' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image size exceeds 10MB limit' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 });
    }

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: Object.keys(ALLOWED_TYPES),
      });
    }

    // Generate clean unique filename. The extension comes from the verified
    // MIME type, not from whatever the client called the file.
    const cleanName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30) || 'image';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `${folder}/${cleanName}-${uniqueSuffix}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: true,
      });

    if (error) {
      log.error('upload_storage_failed', { path: filePath, error });
      return NextResponse.json(
        { error: `Storage upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      path: data.path,
    });
  } catch (error) {
    log.error('upload_failed', { error });
    return NextResponse.json({ error: 'Internal server error during upload' }, { status: 500 });
  }
}
