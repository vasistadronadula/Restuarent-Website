import { buildManifest, roleAppBySlug } from '@/lib/roleApps';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * Per-role web manifest: /manifest/kitchen, /manifest/billing, …
 *
 * Served from a route handler rather than a static file because each role
 * installs a differently-named app pointing at a different start_url (see
 * lib/roleApps.ts). The admin shell swaps the page's <link rel="manifest">
 * to the signed-in role's URL, so the install prompt offers "Pala Pitta
 * Kitchen" to a chef and "Pala Pitta Billing" to a cashier.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const app = roleAppBySlug(slug);

  if (!app) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(JSON.stringify(buildManifest(app), null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Short cache: the manifest is tiny and a stale copy would keep an old
      // app name on the home screen after a rename.
      'Cache-Control': 'public, max-age=300',
    },
  });
}
