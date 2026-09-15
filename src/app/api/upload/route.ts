import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
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
 * Verify the file's magic bytes match its claimed type. `File.type` comes
 * from the uploader's browser and is trivially spoofed — without this, HTML
 * or JS relabelled as image/png would be stored in a public bucket and
 * served back under the restaurant's domain.
 */
export function magicBytesMatch(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  const head = [...buffer.subarray(0, 12)];
  switch (mime) {
    case 'image/png':
      return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
    case 'image/jpeg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'image/gif':
      return head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46;
    case 'image/webp':
      return (
        head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
        head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
      );
    case 'image/avif':
      return head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
    default:
      return false;
  }
}

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
    const caller = await requireStaff(request);
    if (!['admin', 'manager', 'chef'].includes(caller.role)) {
      return NextResponse.json({ error: 'Menu management privileges required.' }, { status: 403 });
    }
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
    const file = formData.get('file');
    const folderValue = formData.get('folder');
    const rawFolder = typeof folderValue === 'string' ? folderValue : 'dishes';
    // Never let the caller steer the storage path — `../` or a leading slash
    // here would write outside the intended prefix.
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'dishes';

    if (!(file instanceof File) || file.size === 0) {
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
    // Unpredictable and collision-safe: timestamp + Math.random could repeat
    // under burst uploads and, with upsert:true, overwrite a sibling file.
    const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const filePath = `${folder}/${cleanName}-${uniqueSuffix}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!magicBytesMatch(buffer, file.type)) {
      return NextResponse.json(
        { error: 'File content does not match its image type' },
        { status: 400 }
      );
    }

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
