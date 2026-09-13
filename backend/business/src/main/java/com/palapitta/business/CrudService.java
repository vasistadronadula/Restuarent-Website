package com.palapitta.business;

import java.math.BigDecimal;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.palapitta.business.Resources.*;
import static org.springframework.http.HttpStatus.*;

@Service
public class CrudService {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private static final Set<String> NUMBERS = Set.of("price","quantity","min_quantity","unit_cost","salary","discount","max_discount","min_order","guests","table_number","capacity","sort_order","prep_time","max_quantity","rating","review_count");
    private static final Set<String> INTEGERS = Set.of("guests","table_number","capacity","sort_order","prep_time","max_quantity","review_count");

    public CrudService(JdbcTemplate db, ObjectMapper json) {
        this.db = db;
        this.json = json;
    }

    public List<Map<String,Object>> list(String name, Identity user, int limit, int offset) {
        Resource r = get(name);
        authorize(r, user, false);
        if (limit < 1 || limit > 100 || offset < 0 || offset > 100000) throw bad("Invalid pagination");
        List<Object> args = new ArrayList<>();
        String where = scope(r, user, false, args);
        args.add(limit);
        args.add(offset);
        String orderClause = r.table().equals("menu_categories") ? "sort_order ASC, " + r.pk() : "created_at DESC, " + r.pk();
        return db.queryForList("SELECT * FROM " + r.table() + " WHERE " + where + " ORDER BY " + orderClause + " LIMIT ? OFFSET ?", args.toArray())
            .stream().map(this::decoded).toList();
    }

    public Map<String,Object> one(String name, String id, Identity user) {
        Resource r = get(name);
        authorize(r, user, false);
        List<Object> args = new ArrayList<>();
        String where = scope(r, user, false, args);
        args.add(id);
        return decoded(found(db.queryForList("SELECT * FROM " + r.table() + " WHERE " + where + " AND " + r.pk() + " = ?", args.toArray())));
    }

    @Transactional
    public Map<String,Object> create(String name, Map<String,Object> input, Identity user) {
        Resource r = get(name);
        authorize(r, user, true);
        Map<String,Object> values = validate(r, input, true, user);
        String pkValue;
        if (r.pk().equals("code")) {
            pkValue = values.get("code").toString();
        } else {
            pkValue = values.containsKey("id") ? values.get("id").toString() : UUID.randomUUID().toString();
            values.put("id", pkValue);
        }
        if (r.owned() && user != null) {
            values.put("user_id", user.id());
        }
        String columns = String.join(",", values.keySet());
        String placeholders = String.join(",", values.keySet().stream().map(this::placeholder).toList());
        Map<String,Object> row = db.queryForMap(
            "INSERT INTO " + r.table() + " (" + columns + ") VALUES (" + placeholders + ") RETURNING *",
            values.values().toArray()
        );
        audit(user, r, pkValue, "create");
        return decoded(row);
    }

    @Transactional
    public Map<String,Object> update(String name, String id, Map<String,Object> input, long version, Identity user) {
        Resource r = get(name);
        authorize(r, user, true);
        Map<String,Object> values = validate(r, input, false, user);
        List<Object> args = new ArrayList<>(values.values());
        String where = scope(r, user, true, args);
        args.add(id);
        String changes = String.join(",", values.keySet().stream().map(k -> k + "=" + placeholder(k)).toList());
        List<Map<String,Object>> rows = db.queryForList(
            "UPDATE " + r.table() + " SET " + changes + " WHERE " + where + " AND " + r.pk() + " = ? RETURNING *",
            args.toArray()
        );
        if (rows.isEmpty()) throw new ResponseStatusException(CONFLICT, "Record changed or is unavailable; refresh before retrying");
        audit(user, r, id, "update");
        return decoded(rows.getFirst());
    }

    @Transactional
    public void delete(String name, String id, long version, Identity user) {
        Resource r = get(name);
        authorize(r, user, true);
        List<Object> args = new ArrayList<>();
        String where = scope(r, user, true, args);
        args.add(id);
        if (db.update("DELETE FROM " + r.table() + " WHERE " + where + " AND " + r.pk() + " = ?", args.toArray()) != 1) {
            throw new ResponseStatusException(CONFLICT, "Record changed or is unavailable; refresh before retrying");
        }
        audit(user, r, id, "delete");
    }

    private String scope(Resource r, Identity user, boolean write, List<Object> args) {
        if (ownerScope(r, user, write)) {
            args.add(user.id());
            return "user_id = ?";
        }
        if (!write && r.publicRead() && (user == null || !r.writers().contains(user.role()))) {
            return r.table().equals("menu_items") ? "is_available = true" : "is_active = true";
        }
        return "1=1";
    }

    private Map<String,Object> validate(Resource r, Map<String,Object> input, boolean create, Identity user) {
        if (input.isEmpty() || !r.fields().containsAll(input.keySet())) throw bad("Unknown or empty fields");
        if (create && !input.keySet().containsAll(r.required())) throw bad("Required fields are missing");
        if (r.owned() && ownerScope(r, user, true)) {
            if (input.containsKey("table_id")) throw new ResponseStatusException(FORBIDDEN, "Only staff can assign a table");
            if (input.containsKey("status") && !(create ? "pending" : "cancelled").equals(input.get("status"))) {
                throw new ResponseStatusException(FORBIDDEN, "Invalid customer reservation status");
            }
        }
        Map<String,Object> values = new LinkedHashMap<>();
        input.forEach((key, value) -> {
            if (value == null) {
                if (r.required().contains(key)) throw bad("Required fields cannot be null");
                values.put(key, null);
                return;
            }
            if (key.equals("tags")) {
                if (!(value instanceof List<?> tags) || tags.size() > 30 || tags.stream().anyMatch(v -> !(v instanceof String s) || s.length() > 80)) {
                    throw bad("Invalid tags");
                }
                String pgArray = "{" + String.join(",", tags.stream().map(v -> "\"" + v.toString().replace("\"", "\\\"") + "\"").toList()) + "}";
                values.put("tags", pgArray);
            } else if (key.equals("portion_prices")) {
                if (!(value instanceof Map<?,?> prices) || !Set.of("single","full","large").containsAll(prices.keySet())) {
                    throw bad("Invalid portions");
                }
                for (Object price : prices.values()) {
                    if (!(price instanceof Number)) throw bad("Invalid portion price");
                    BigDecimal amount = new BigDecimal(price.toString());
                    if (amount.signum() <= 0 || amount.compareTo(new BigDecimal("100000")) > 0 || amount.stripTrailingZeros().scale() > 2) {
                        throw bad("Invalid portion price");
                    }
                }
                try { values.put(key, json.writeValueAsString(value)); }
                catch (Exception e) { throw bad("Invalid JSON value"); }
            } else if (NUMBERS.contains(key)) {
                if (!(value instanceof Number)) throw bad("Expected a number: " + key);
                BigDecimal n;
                try { n = new BigDecimal(value.toString()); }
                catch (NumberFormatException e) { throw bad("Invalid number"); }
                if (n.abs().compareTo(new BigDecimal("1000000000")) > 0 || (INTEGERS.contains(key) && n.stripTrailingZeros().scale() > 0)) {
                    throw bad("Number out of range");
                }
                values.put(key, n);
            } else if (key.startsWith("is_")) {
                if (!(value instanceof Boolean)) throw bad("Expected a boolean: " + key);
                values.put(key, value);
            } else {
                if (!(value instanceof String text) || text.length() > 4000 || (r.required().contains(key) && text.isBlank())) {
                    throw bad("Invalid text: " + key);
                }
                values.put(key, text.strip());
            }
        });
        return values;
    }

    private void audit(Identity user, Resource r, String id, String operation) {
        if (user != null) {
            try {
                db.update("INSERT INTO public.admin_audit_log(actor_id, table_name, operation, record_id) VALUES (?,?,?,?)",
                    user.id(), r.table(), operation, id);
            } catch (Exception ignored) {}
        }
    }

    private String placeholder(String field) {
        if ("tags".equals(field)) return "CAST(? AS text[])";
        if ("portion_prices".equals(field)) return "CAST(? AS jsonb)";
        return "?";
    }

    private Map<String,Object> decoded(Map<String,Object> row) {
        if (row.get("portion_prices") != null) {
            try {
                row.put("portion_prices", json.readValue(row.get("portion_prices").toString(), Object.class));
            } catch (Exception ignored) {}
        }
        if (row.containsKey("tags")) {
            Object tagsObj = row.get("tags");
            if (tagsObj instanceof java.sql.Array arr) {
                try {
                    row.put("tags", Arrays.asList((String[]) arr.getArray()));
                } catch (Exception e) {
                    row.put("tags", Collections.emptyList());
                }
            } else if (tagsObj instanceof String s) {
                if (s.startsWith("{") && s.endsWith("}")) {
                    String inner = s.substring(1, s.length() - 1).trim();
                    if (inner.isEmpty()) {
                        row.put("tags", Collections.emptyList());
                    } else {
                        row.put("tags", Arrays.stream(inner.split(",")).map(t -> t.replace("\"", "").trim()).toList());
                    }
                } else {
                    try {
                        row.put("tags", json.readValue(s, List.class));
                    } catch (Exception e) {
                        row.put("tags", Collections.emptyList());
                    }
                }
            } else if (tagsObj == null) {
                row.put("tags", Collections.emptyList());
            }
        }
        return row;
    }

    private Map<String,Object> found(List<Map<String,Object>> rows) {
        if (rows.isEmpty()) throw new ResponseStatusException(NOT_FOUND, "Record not found");
        return rows.getFirst();
    }

    private ResponseStatusException bad(String message) {
        return new ResponseStatusException(BAD_REQUEST, message);
    }
}
