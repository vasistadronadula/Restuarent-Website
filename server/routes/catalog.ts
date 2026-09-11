import type { FastifyInstance } from 'fastify';
import { ResourceCache } from '../cache';

declare module 'fastify' {
  interface FastifyInstance { catalogCache: ResourceCache }
}

export default async function catalogRoutes(app: FastifyInstance) {
  for (const [path, table, columns, order] of [
    ['/api/menu-items', 'menu_items', 'id,name,category,price,image,veg_status,rating,review_count,is_popular,is_special,is_available,description,prep_time,tags,portion_prices,max_quantity', 'created_at'],
    ['/api/menu-categories', 'menu_categories', 'id,name,slug,icon,image,sort_order,is_active', 'sort_order'],
  ]) {
    app.get(path, async (_request, reply) => {
      const rows = await app.catalogCache.get(table, async () => {
        if (!app.publicDb) throw app.httpErrors.serviceUnavailable('Menu is not configured');
        const { data, error } = await app.publicDb.from(table).select(columns).order(order, { ascending: order === 'sort_order' }).order('id').limit(1000);
        if (error) {
          app.log.error({ code: error.code, table }, 'Catalog read failed');
          throw app.httpErrors.serviceUnavailable('The menu is temporarily unavailable. Please try again.');
        }
        return data || [];
      });
      // Browser revalidates; the short server cache coalesces reads across diners.
      return reply.header('Cache-Control', 'public, max-age=0, must-revalidate').send(rows);
    });
  }
}
