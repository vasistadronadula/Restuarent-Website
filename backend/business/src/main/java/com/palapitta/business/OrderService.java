package com.palapitta.business;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class OrderService {
    private static final SecureRandom ORDER_RANDOM = new SecureRandom();

    static String newOrderId() {
        byte[] bytes = new byte[10];
        ORDER_RANDOM.nextBytes(bytes);
        return "PPR-ORD-" + LocalDate.now(ZoneId.of("Asia/Kolkata")).format(DateTimeFormatter.BASIC_ISO_DATE)
            + "-" + HexFormat.of().formatHex(bytes).substring(0, 19)
            + String.format(Locale.ROOT, "%04d", ORDER_RANDOM.nextInt(10000));
    }
    public record Line(@NotBlank @Size(max=80) String menuItemId, @Min(1) @Max(200) int quantity,
        @Pattern(regexp="single|full|large") String selectedPortion) {}
    public record Checkout(@NotBlank @Size(max=120) String customerName,
        @NotBlank @Pattern(regexp="[+0-9 ()-]{7,25}") String customerPhone,
        @NotNull @Pattern(regexp="takeaway|dine-in") String orderType, @Min(1) Integer tableNumber,
        @NotEmpty @Size(max=50) List<@Valid Line> items, @Size(max=80) String couponCode) {}
    public record Totals(BigDecimal subtotal, BigDecimal discount, BigDecimal cgst, BigDecimal sgst,
        BigDecimal grandTotal, BigDecimal roundOff) {}

    private final JdbcTemplate db;
    private final ObjectMapper json;

    public OrderService(JdbcTemplate db, ObjectMapper json) {
        this.db = db;
        this.json = json;
    }

    public static Totals totals(BigDecimal subtotal, BigDecimal discount) {
        discount = discount.max(BigDecimal.ZERO).min(subtotal).setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxable = subtotal.subtract(discount);
        BigDecimal tax = taxable.multiply(new BigDecimal("0.025")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal payable = taxable.add(tax.multiply(BigDecimal.valueOf(2)));
        BigDecimal total = payable.setScale(0, RoundingMode.HALF_UP);
        return new Totals(subtotal, discount, tax, tax, total, total.subtract(payable));
    }

    @Transactional
    public Map<String,Object> checkout(Checkout input, String idempotencyKey, Identity user) {
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 200)
            throw bad("An idempotency key is required to place an order");
        String key = idempotencyKey;
        String requestKey = hash((user == null ? "guest" : user.id().toString()) + ":" + key);
        String requestHash = hash(encode(input));
        // Transaction-scoped database lock serializes the same request across
        // processes. The saved key commits atomically with the order.
        db.queryForList("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", requestKey);
        List<Map<String,Object>> previous = db.queryForList(
            "SELECT request_hash, order_id FROM public.checkout_requests WHERE request_key=?", requestKey);
        if (!previous.isEmpty()) {
            Map<String,Object> saved = previous.getFirst();
            if (!requestHash.equals(saved.get("request_hash"))) throw conflict("Idempotency key already used for a different basket");
            Map<String,Object> order = decoded(db.queryForMap("SELECT *, xmin::text::bigint AS version FROM public.orders WHERE id=?", saved.get("order_id")));
            // The key is scoped to one caller: never disclose another guest's
            // or user's order through a reused key.
            Object owner = order.get("user_id");
            Object caller = user == null ? null : user.id().toString();
            if (!Objects.equals(owner == null ? null : owner.toString(), caller))
                throw conflict("Idempotency key already used for a different basket");
            return order;
        }

        if (input.orderType().equals("dine-in")) {
            if (user == null || !user.hasRole("admin","manager","cashier","waiter")) {
                throw new ResponseStatusException(FORBIDDEN, "Only staff can open a dine-in table order");
            }
            if (input.tableNumber() == null || db.queryForList("SELECT id FROM restaurant_tables WHERE table_number=? AND is_active FOR SHARE", input.tableNumber()).isEmpty()) {
                throw bad("Dining table is unavailable");
            }
        } else if (input.tableNumber() != null) {
            throw bad("Takeaway orders cannot have a table number");
        }

        // Lock menu items to ensure concurrent pricing accuracy
        Map<String,Map<String,Object>> menu = new HashMap<>();
        for (String id : input.items().stream().map(Line::menuItemId).distinct().sorted().toList()) {
            List<Map<String,Object>> rows = db.queryForList("SELECT * FROM menu_items WHERE id=? AND is_available FOR SHARE", id);
            if (rows.isEmpty()) throw bad("An item is no longer available");
            menu.put(id, rows.getFirst());
        }

        List<Map<String,Object>> lines = new ArrayList<>();
        Map<String,Integer> quantities = new HashMap<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Line line : input.items()) {
            Map<String,Object> item = menu.get(line.menuItemId());
            int maxQty = item.get("max_quantity") != null ? Math.min(((Number)item.get("max_quantity")).intValue(), 200) : 200;
            int quantity = quantities.merge(line.menuItemId(), line.quantity(), Integer::sum);
            if (quantity > maxQty) throw bad("Quantity exceeds the limit for item: " + item.get("name"));

            Map<String,BigDecimal> portions = decodePrices(item.get("portion_prices"));
            String portion = line.selectedPortion() == null ? "full" : line.selectedPortion();
            BigDecimal price = portions.isEmpty() && portion.equals("full")
                ? new BigDecimal(item.get("price").toString())
                : portions.get(portion);

            if (price == null || price.signum() <= 0) {
                throw bad("Selected portion is unavailable for item: " + item.get("name"));
            }

            lines.add(Map.of(
                "id", line.menuItemId(),
                "menuItemId", line.menuItemId(),
                "name", item.get("name"),
                "price", price,
                "quantity", line.quantity(),
                "selectedPortion", portion,
                "vegStatus", item.get("veg_status") != null ? item.get("veg_status") : "non-veg",
                "category", Objects.toString(item.get("category"), "")
            ));
            subtotal = subtotal.add(price.multiply(BigDecimal.valueOf(line.quantity())));
        }

        String code = input.couponCode() == null ? "" : input.couponCode().strip().toUpperCase(Locale.ROOT);
        BigDecimal discount = BigDecimal.ZERO;
        if (!code.isEmpty()) {
            List<Map<String,Object>> rows = db.queryForList("SELECT * FROM coupons WHERE code=? AND is_active FOR SHARE", code);
            if (rows.isEmpty()) throw bad("Coupon is invalid or inactive");
            Map<String,Object> coupon = rows.getFirst();
            BigDecimal minOrder = new BigDecimal(coupon.get("min_order").toString());
            if (subtotal.compareTo(minOrder) < 0) throw bad("Coupon minimum order amount has not been reached");
            BigDecimal discPct = new BigDecimal(coupon.get("discount").toString());
            discount = subtotal.multiply(discPct).movePointLeft(2);
            BigDecimal cap = new BigDecimal(coupon.get("max_discount").toString());
            if (cap.signum() > 0) discount = discount.min(cap);
        }

        Totals t = totals(subtotal, discount);
        if (t.grandTotal().signum() <= 0 || t.grandTotal().compareTo(new BigDecimal("100000")) > 0) {
            throw bad("Order total is invalid");
        }

        String orderId = newOrderId();
        UUID userId = user != null ? user.id() : null;

        Map<String,Object> order = db.queryForMap("""
            INSERT INTO public.orders(
                id, user_id, customer_name, customer_phone, order_type, table_number, items,
                subtotal, discount, cgst, sgst, delivery_charge, grand_total, coupon_code,
                payment_mode, payment_status, status, order_source, created_at
            )
            VALUES (?,?,?,?,?,?,CAST(? AS jsonb),?,?,?,?,?,?,?,'cash','unpaid','pending','direct',now())
            RETURNING *, xmin::text::bigint AS version
            """,
            orderId, userId, input.customerName(), input.customerPhone(), input.orderType(), input.tableNumber(),
            encode(lines), t.subtotal(), t.discount(), t.cgst(), t.sgst(), BigDecimal.ZERO, t.grandTotal(),
            code.isEmpty() ? null : code
        );

        db.update("INSERT INTO public.checkout_requests(request_key, request_hash, order_id) VALUES (?,?,?)",
            requestKey, requestHash, orderId);
        audit(user, orderId, "order:create");
        return decoded(order);
    }

    public List<Map<String,Object>> list(Identity user, int limit, int offset, Instant from, Instant to) {
        if (limit < 1 || limit > 100 || offset < 0 || offset > 100000) throw bad("Invalid pagination");
        List<Object> args = new ArrayList<>();
        String where = scope(user, args);
        if (from != null) { where += " AND created_at >= ?"; args.add(java.sql.Timestamp.from(from)); }
        if (to != null) { where += " AND created_at < ?"; args.add(java.sql.Timestamp.from(to)); }
        args.add(limit);
        args.add(offset);
        return db.queryForList("SELECT *, xmin::text::bigint AS version FROM public.orders WHERE " + where + " ORDER BY created_at DESC, id LIMIT ? OFFSET ?", args.toArray())
            .stream().map(this::decoded).toList();
    }

    public List<Map<String,Object>> floorOrders(Identity user) {
        if (user == null || !user.hasRole("admin","manager","waiter","cashier")) {
            throw new ResponseStatusException(FORBIDDEN, "Floor access denied");
        }
        return db.queryForList("""
            SELECT id, status, payment_status, grand_total, subtotal, table_number, created_at
            FROM public.orders
            WHERE table_number IS NOT NULL AND status NOT IN ('delivered', 'cancelled')
            ORDER BY created_at DESC
            """);
    }

    public Map<String,Object> one(String id, Identity user) {
        List<Object> args = new ArrayList<>();
        String where = scope(user, args);
        args.add(id);
        List<Map<String,Object>> rows = db.queryForList("SELECT *, xmin::text::bigint AS version FROM public.orders WHERE " + where + " AND id=?", args.toArray());
        if (rows.isEmpty()) throw new ResponseStatusException(NOT_FOUND, "Order not found");
        return decoded(rows.getFirst());
    }

    @Transactional
    public Map<String,Object> status(String id, String next, long version, Identity user) {
        List<Object> args = new ArrayList<>();
        String where = scope(user, args);
        args.add(id);
        List<Map<String,Object>> rows = db.queryForList("SELECT *, xmin::text::bigint AS version FROM public.orders WHERE " + where + " AND id=? FOR UPDATE", args.toArray());
        if (rows.isEmpty()) throw new ResponseStatusException(NOT_FOUND, "Order not found");
        Map<String,Object> order = rows.getFirst();
        if (version > 0 && ((Number)order.get("version")).longValue() != version) throw conflict("Order changed; refresh before retrying");
        String current = order.get("status").toString();

        boolean staff = user != null && user.hasRole("admin", "manager", "cashier", "chef");
        if (!staff && !(next.equals("cancelled") && current.equals("pending"))) {
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        }
        if (user != null && user.hasRole("chef") && !Set.of("preparing", "ready").contains(next)) {
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        }
        if (next.equals("cancelled") && "paid".equals(order.get("payment_status"))) {
            throw conflict("Paid orders require a refund workflow before cancellation");
        }

        Map<String,Set<String>> transitions = Map.of(
            "pending", Set.of("preparing", "cancelled"),
            "preparing", Set.of("ready", "cancelled"),
            "ready", Set.of("delivered", "cancelled")
        );
        if (!transitions.getOrDefault(current, Set.of()).contains(next)) {
            throw conflict("Invalid order status transition from " + current + " to " + next);
        }

        Map<String,Object> result = db.queryForMap("UPDATE public.orders SET status=? WHERE id=? RETURNING *, xmin::text::bigint AS version", next, id);
        audit(user, id, "order:status:" + next);
        return decoded(result);
    }

    @Transactional
    public Map<String,Object> collectCash(String id, long version, Identity user) {
        if (user == null || !user.hasRole("admin", "manager", "cashier")) {
            throw new ResponseStatusException(FORBIDDEN, "Only cashiers or managers can collect payment");
        }
        List<Map<String,Object>> rows = db.queryForList("""
            UPDATE public.orders SET payment_status='paid'
            WHERE id=? AND payment_mode='cash' AND payment_status='unpaid' AND status<>'cancelled'
            AND (? = 0 OR xmin::text::bigint = ?)
            RETURNING *, xmin::text::bigint AS version
            """, id, version, version);
        if (rows.isEmpty()) throw conflict("Order not found or cannot accept cash payment");
        audit(user, id, "order:cash:collected");
        return decoded(rows.getFirst());
    }

    @Transactional
    public Map<String,Object> updatePrep(String id, int delayMinutes, String notes, Identity user) {
        if (user == null || !user.hasRole("admin", "manager", "chef")) {
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        }
        if (delayMinutes < 0 || delayMinutes > 1440) throw bad("Invalid delay minutes");
        String sql = "UPDATE public.orders SET delay_minutes = ?" + (notes != null ? ", notes = ?" : "") + " WHERE id = ? RETURNING *, xmin::text::bigint AS version";
        List<Object> args = new ArrayList<>();
        args.add(delayMinutes);
        if (notes != null) args.add(notes);
        args.add(id);
        List<Map<String,Object>> rows = db.queryForList(sql, args.toArray());
        if (rows.isEmpty()) throw new ResponseStatusException(NOT_FOUND, "Order not found");
        audit(user, id, "order:prep:delay=" + delayMinutes);
        return decoded(rows.getFirst());
    }

    private String scope(Identity user, List<Object> args) {
        if (user != null && user.hasRole("admin", "manager", "cashier", "chef")) return "1=1";
        if (user != null) {
            args.add(user.id());
            return "user_id = ?";
        }
        return "1=0";
    }

    private void audit(Identity user, String id, String operation) {
        if (user != null) {
            try {
                db.update("INSERT INTO public.admin_audit_log(actor_id, table_name, operation, record_id) VALUES (?,'orders',?,?)",
                    user.id(), operation, id);
            } catch (Exception ignored) {}
        }
    }

    private Map<String,Object> decoded(Map<String,Object> row) {
        if (row.get("items") != null) {
            try {
                row.put("items", json.readValue(row.get("items").toString(), List.class));
            } catch (Exception e) {
                // leave as is if already a list or unparseable
            }
        }
        return row;
    }

    private Map<String,BigDecimal> decodePrices(Object value) {
        if (value == null) return Collections.emptyMap();
        try {
            return json.readValue(value.toString(), new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    private ResponseStatusException bad(String value) { return new ResponseStatusException(BAD_REQUEST, value); }
    private ResponseStatusException conflict(String value) { return new ResponseStatusException(CONFLICT, value); }
}
