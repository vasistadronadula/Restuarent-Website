# KDS layout and deployment

## Implemented

- Dedicated viewport-height kitchen screen with one compact toolbar. The shared admin shell already excluded the sidebar; the extra admin header is now omitted on KDS too. Other admin pages retain their headers.
- Container-based layout: three independently scrolling lanes at 1200px available width; stage tabs with two tickets per row at 768–1199px; one ticket per row below 768px. Short landscape keeps the controls compact. The page itself does not scroll behind the board.
- Larger ticket numbers and 20px dish names. Names, portions, quantities, per-item notes, and special instructions wrap instead of truncating. Prices and customer contact details are removed from cooking tickets.
- Separate waiting, cooking, and pickup clocks. Historical stage timestamps are displayed as unknown rather than fabricated. Overdue preparation warnings do not appear on ready tickets.
- Visible fullscreen and sound controls; labelled icon controls on phones. Sound starts off until explicitly enabled. Keyboard shortcuts pause inside dialogs and editable fields.
- Tools dialog for filters, history and refresh; batch preparation no longer occupies a permanent ribbon above the tickets. Batch groups preserve portion and instruction differences and exclude prepared lines.
- Distinct FIFO, due-soonest, and table sorting. Removed misleading average-prep/on-time metrics rather than presenting estimates as measured performance.
- Persistent connection state: Live when subscribed and recently refreshed, Polling when reads are current without a confirmed subscription, Reconnecting when reads are stale/failing, and Offline when the browser reports no connection. Polling continues on empty boards and in background tabs while KDS is mounted.
- Per-ticket save locks, non-optimistic KDS transitions, explicit save errors, and an Undo action. Offline operations fail instead of being queued for replay. Status updates compare the expected server state; kitchen detail updates also compare notes and delay values to avoid overwriting a newer edit.
- Server-backed checklist progress with atomic line updates. Content-based identities survive property ordering and moving a distinct line; quantity/portion/modifier changes create a new unprepared identity. Duplicate lines have separate occurrence identities. No progress is claimed as saved before the database responds.

## Database migration required

The application code is implemented, but production was **not migrated or modified** in this task.

Apply `supabase/migrations/20260828120000_kitchen_progress_and_timing.sql` through the project's normal reviewed migration process, after its existing prerequisite migrations. It adds:

- `orders.preparing_at`, `ready_at`, `delivered_at` and `kitchen_progress`.
- A trigger recording stage changes using the database clock. Returning a ticket to an earlier preparation cycle clears obsolete preparation state where appropriate.
- `set_kitchen_item_prepared`, a security-invoker RPC using existing order RLS policies and the existing staff access helper. It locks the order, validates the current line and its identity, then merges only that line's progress.

Without the migration, existing stage actions still work, but checklist controls are disabled with an explicit setup message. Historical ready/preparing tickets have no precise stage time until they make a new transition; no backfill guesses their history. The migration does not rewrite existing item payloads or seed business data.

The shared realtime provider already subscribes to `orders`. Ensure that subscription remains permitted in the deployment. Polling provides a visible fallback, not a false claim that the websocket is connected.

## Verification

- Automated checks passed: `npm test` (108 tests across 13 files), `npm run lint`, and `npm run build` (including TypeScript and all 48 pages). `git diff --check` also passed.
- Unit tests cover stage timing, invalid timestamps, stable line identity, distinct urgency sorting, and modifier-safe batch grouping.
- React interaction tests cover readable ticket content, double-tap protection, failed saves, offline blocking, Undo connectivity re-checks, missing migration behavior, pickup clocks and dialog keyboard handling.
- The actual migration was executed against isolated PGlite PostgreSQL. Tests cover merging independent progress changes, idempotency, unchecking, stale content, incorrect identities, rejected customer access, and timestamp transitions. This is not a two-connection Supabase concurrency/load test.
- Browser checks used the actual KDS components and CSS with synthetic tickets and mocked backend hooks in a temporary isolated preview. Checked 320, 390, 768, 1024, 1440 and 1920px widths, plus 844×390 landscape. No horizontal page overflow; one/two-card layouts and three lanes appeared at their intended breakpoints. Short landscape dialogs stayed within the viewport and their Save button was reachable by scrolling/focus.
- Browser interactions verified item preparation and stage advancement without switching the active stage. No live orders, payment, WhatsApp message, staff login bypass or production write occurred. The temporary preview was removed.

## Deployment acceptance checks

1. Apply the migration to a staging database first; open KDS as an authorized chef on two devices.
2. Check different lines of the same ticket on each device. Reload both and confirm progress persists without lost checks.
3. Race status changes and edit a line while another device has an older copy. Confirm a stale action fails and refreshes rather than overwriting the newer state.
4. Verify waiting/cooking/pickup timestamps, recall, Undo and actual notification delivery using test orders.
5. Disconnect and reconnect a device, including with an Undo toast open. Confirm no old action is replayed automatically.
6. Test long tickets, real touch input, display distance, mobile keyboards, fullscreen support, and all relevant staff roles on the target hardware.

This update does not add station routing; the board continues to show all permitted kitchen orders. Real cooking-duration analytics can be built from the new timestamps once enough measured data exists.
