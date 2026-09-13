package com.palapitta.business;

import java.util.Map;
import java.util.Set;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

// SQL identifiers come exclusively from this registry, never from request input.
public final class Resources {
    public record Resource(String table, String pk, Set<String> fields, Set<String> required, Set<String> readers,
        Set<String> writers, boolean publicRead, boolean owned) {}
    private static Set<String> fields(String value) { return Set.of(value.split(",")); }
    private static final Set<String> MANAGERS = Set.of("admin", "manager");
    private static final Set<String> STAFF = Set.of("admin", "manager", "chef", "cashier", "waiter");
    private static Resource resource(String table, String pk, String fields, String required, Set<String> readers, Set<String> writers, boolean publicRead, boolean owned) {
        return new Resource(table, pk, fields(fields), fields(required), readers, writers, publicRead, owned);
    }
    private static final Map<String, Resource> ALL = Map.of(
        "menu_items", resource("menu_items", "id", "name,category,price,image,veg_status,is_available,is_popular,is_special,description,prep_time,max_quantity,portion_prices,tags,rating,review_count", "name,category,price", STAFF, Set.of("admin","manager","chef"), true, false),
        "menu_categories", resource("menu_categories", "id", "name,slug,icon,image,sort_order,is_active", "name", STAFF, MANAGERS, true, false),
        "inventory_items", resource("inventory_items", "id", "name,category,quantity,unit,min_quantity,unit_cost,supplier,last_restocked", "name,category,unit", STAFF, MANAGERS, false, false),
        "employees", resource("employees", "id", "name,role,phone,email,shift,salary,joining_date,status", "name,role,phone", MANAGERS, Set.of("admin"), false, false),
        "restaurant_tables", resource("restaurant_tables", "id", "table_number,capacity,description,is_active", "table_number", STAFF, MANAGERS, false, false),
        "coupons", resource("coupons", "code", "code,discount,max_discount,min_order,description,is_active", "code,discount", MANAGERS, MANAGERS, false, false),
        "reservations", resource("reservations", "id", "name,phone,email,guests,date,time,request,status,table_id,table_number", "name,phone,guests,date,time", Set.of("admin","manager","waiter","cashier"), Set.of("admin","manager","waiter","cashier"), false, true)
    );
    public static Resource get(String name) {
        Resource r = ALL.get(name);
        if (r == null) throw new ResponseStatusException(NOT_FOUND, "Unknown resource");
        return r;
    }
    public static void authorize(Resource r, Identity user, boolean write) {
        if (!write && r.publicRead()) return;
        if (user == null) throw new ResponseStatusException(UNAUTHORIZED, "Authentication required");
        if (r.owned() || (write ? r.writers() : r.readers()).contains(user.role())) return;
        throw new ResponseStatusException(FORBIDDEN, "Access denied");
    }
    public static boolean ownerScope(Resource r, Identity user, boolean write) {
        return r.owned() && !(write ? r.writers() : r.readers()).contains(user.role());
    }
    private Resources() {}
}
