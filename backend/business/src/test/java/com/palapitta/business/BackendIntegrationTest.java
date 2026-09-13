package com.palapitta.business;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class BackendIntegrationTest {
    // Exercise PostgreSQL SQL/JSONB/RETURNING semantics against PostgreSQL.
    // H2 compatibility mode cannot run the production connection setup or CRUD.
    private static final EmbeddedPostgres POSTGRES = startPostgres();

    private static EmbeddedPostgres startPostgres() {
        try { return EmbeddedPostgres.start(); }
        catch (IOException error) { throw new ExceptionInInitializerError(error); }
    }

    @AfterAll
    static void stopPostgres() throws IOException { POSTGRES.close(); }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        properties.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        properties.add("spring.datasource.username", () -> "postgres");
        properties.add("spring.datasource.password", () -> "postgres");
        properties.add("supabase.jwt.secret", () -> "test-supabase-jwt-secret-key-for-unit-tests-12345");
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired AuthService auth;
    @LocalServerPort int port;

    @BeforeEach
    void setupSchemaAndReset() {
        db.execute("""
            CREATE TABLE IF NOT EXISTS public.profiles (
                id UUID PRIMARY KEY,
                email TEXT NOT NULL,
                full_name TEXT,
                phone TEXT,
                role TEXT NOT NULL DEFAULT 'customer',
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.menu_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                slug TEXT,
                icon TEXT,
                image TEXT,
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.menu_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price NUMERIC NOT NULL,
                image TEXT,
                veg_status TEXT DEFAULT 'non-veg',
                rating NUMERIC DEFAULT 4.5,
                review_count INTEGER DEFAULT 100,
                is_popular BOOLEAN DEFAULT false,
                is_special BOOLEAN DEFAULT false,
                is_available BOOLEAN DEFAULT true,
                description TEXT,
                prep_time INTEGER DEFAULT 25,
                tags TEXT[] DEFAULT '{}',
                portion_prices JSONB,
                max_quantity INTEGER DEFAULT 20,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.inventory_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                quantity NUMERIC NOT NULL DEFAULT 0,
                unit TEXT NOT NULL,
                min_quantity NUMERIC NOT NULL DEFAULT 5,
                last_restocked TEXT,
                supplier TEXT,
                unit_cost NUMERIC DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                shift TEXT DEFAULT 'Morning',
                salary NUMERIC DEFAULT 0,
                joining_date TEXT,
                status TEXT DEFAULT 'Active',
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.restaurant_tables (
                id TEXT PRIMARY KEY,
                table_number INTEGER UNIQUE NOT NULL,
                capacity INTEGER NOT NULL DEFAULT 4,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.coupons (
                code TEXT PRIMARY KEY,
                discount NUMERIC NOT NULL DEFAULT 0,
                max_discount NUMERIC NOT NULL DEFAULT 0,
                min_order NUMERIC NOT NULL DEFAULT 0,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.reservations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                guests INTEGER NOT NULL DEFAULT 2,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                request TEXT,
                status TEXT DEFAULT 'pending',
                table_id TEXT,
                table_number INTEGER,
                user_id UUID,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.orders (
                id TEXT PRIMARY KEY,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                customer_email TEXT,
                delivery_address TEXT,
                order_type TEXT DEFAULT 'takeaway',
                payment_mode TEXT DEFAULT 'cash',
                payment_status TEXT DEFAULT 'unpaid',
                items JSONB NOT NULL DEFAULT '[]'::jsonb,
                subtotal NUMERIC NOT NULL DEFAULT 0,
                cgst NUMERIC NOT NULL DEFAULT 0,
                sgst NUMERIC NOT NULL DEFAULT 0,
                delivery_charge NUMERIC NOT NULL DEFAULT 0,
                discount NUMERIC NOT NULL DEFAULT 0,
                grand_total NUMERIC NOT NULL DEFAULT 0,
                status TEXT DEFAULT 'pending',
                order_time TEXT,
                coupon_code TEXT,
                order_source TEXT DEFAULT 'direct',
                user_id UUID,
                table_number INTEGER,
                order_number INTEGER,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.admin_audit_log (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                occurred_at TIMESTAMPTZ DEFAULT now(),
                actor_id UUID,
                table_name TEXT,
                operation TEXT,
                record_id TEXT,
                new_data JSONB
            );
            TRUNCATE public.profiles, public.menu_items, public.menu_categories, public.inventory_items,
                     public.employees, public.restaurant_tables, public.coupons, public.reservations,
                     public.admin_audit_log, public.orders CASCADE;
        """);
    }

    @Test
    void allResourceCrudOperations() throws Exception {
        String admin = account("admin");
        Map<String,Map<String,Object>> resources = Map.of(
            "menu_items", Map.of("name","Biryani","category","Rice","price",299,"portion_prices",Map.of("full",299,"single",199)),
            "menu_categories", Map.of("name","Rice","slug","rice"),
            "inventory_items", Map.of("name","Rice","category","Grain","unit","kg"),
            "employees", Map.of("name","Staff","role","Waiter","phone","9999999999"),
            "restaurant_tables", Map.of("table_number",1),
            "coupons", Map.of("code","WELCOME","discount",10),
            "reservations", Map.of("name","Diner","phone","9999999999","guests",2,"date","2026-10-12","time","19:00")
        );
        for (var entry : resources.entrySet()) {
            String path = "/api/v1/data/" + entry.getKey();
            JsonNode row = body(send(post(path), admin, entry.getValue()).andExpect(status().isCreated())).path("data");
            String key = entry.getKey().equals("coupons") ? row.path("code").asText() : row.path("id").asText();
            send(get(path + "/" + key), admin, null).andExpect(status().isOk());
            send(get(path), admin, null).andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1));
            String field = entry.getKey().equals("coupons") ? "description" : entry.getKey().equals("restaurant_tables") ? "description" : "name";
            send(patch(path + "/" + key), admin, Map.of(field, "Updated")).andExpect(status().isOk());
            send(delete(path + "/" + key), admin, null).andExpect(status().isNoContent());
            send(get(path + "/" + key), admin, null).andExpect(status().isNotFound());
        }
        assertEquals(21, db.queryForObject("SELECT count(*) FROM public.admin_audit_log", Integer.class));
    }

    @Test
    void permissionsAndOwnership() throws Exception {
        String customer = account("customer"), stranger = account("customer"), chef = account("chef");
        send(post("/api/v1/data/menu_items"), customer, Map.of("name","Hack","category","X","price",1)).andExpect(status().isForbidden());
        send(get("/api/v1/data/employees"), chef, null).andExpect(status().isForbidden());
        send(get("/api/v1/data/inventory_items"), null, null).andExpect(status().isUnauthorized());
        send(get("/api/v1/data/unknown_resource"), customer, null).andExpect(status().isNotFound());

        String path = "/api/v1/data/reservations";
        Map<String,Object> reservation = Map.of("name","Diner","phone","9999999999","guests",2,"date","2026-10-12","time","19:00");
        String id = body(send(post(path), customer, reservation).andExpect(status().isCreated())).path("data").path("id").asText();
        send(get(path + "/" + id), stranger, null).andExpect(status().isNotFound());
        send(get(path), stranger, null).andExpect(jsonPath("$.data.length()").value(0));
        send(patch(path + "/" + id), customer, Map.of("status","confirmed")).andExpect(status().isForbidden());

        send(get("/api/v1/auth/me"), customer, null).andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("customer"));
    }

    @Test
    void checkoutPricingAndStatusTransitions() throws Exception {
        String admin = account("admin"), customer = account("customer");
        String item = body(send(post("/api/v1/data/menu_items"), admin, Map.of("name","Dish","category","Rice","price",199,"max_quantity",2)).andExpect(status().isCreated())).path("data").path("id").asText();
        Map<String,Object> basket = Map.of("customerName","Diner","customerPhone","9999999999","orderType","takeaway","items",List.of(Map.of("menuItemId",item,"quantity",2)));

        JsonNode created = body(send(post("/api/v1/orders/checkout").header("Idempotency-Key", UUID.randomUUID().toString()), customer, basket).andExpect(status().isOk())).path("data");
        assertEquals(0, new BigDecimal("398.00").compareTo(created.path("subtotal").decimalValue()));
        assertEquals(0, new BigDecimal("418").compareTo(created.path("grand_total").decimalValue()));
        String orderId = created.path("id").asText();
        assertTrue(orderId.matches("PPR-ORD-\\d{8}-[a-f0-9]{19}\\d{4}"));
        assertEquals(40, orderId.length());

        // Check transition
        send(patch("/api/v1/orders/" + orderId + "/status"), admin, Map.of("status", "preparing")).andExpect(status().isOk());
        send(patch("/api/v1/orders/" + orderId + "/status"), admin, Map.of("status", "ready")).andExpect(status().isOk());

        // Cash collection
        send(post("/api/v1/orders/" + orderId + "/cash-payment"), admin, null).andExpect(status().isOk());
        send(patch("/api/v1/orders/" + orderId + "/status"), admin, Map.of("status", "delivered")).andExpect(status().isOk());
    }

    @Test
    void guestCannotOpenDiningTableOrder() throws Exception {
        send(post("/api/v1/orders/checkout"), null, Map.of(
            "customerName", "Guest", "customerPhone", "9999999999", "orderType", "dine-in",
            "tableNumber", 1, "items", List.of(Map.of("menuItemId", "dish", "quantity", 1))
        )).andExpect(status().isForbidden());
    }

    private String account(String role) {
        UUID id = UUID.randomUUID();
        String email = role + "_" + id + "@example.com";
        db.update("INSERT INTO public.profiles(id, email, full_name, role) VALUES (?,?,?,?)",
            id, email, "Test " + role, role);
        return auth.createTestToken(id, email, role);
    }

    private ResultActions send(MockHttpServletRequestBuilder req, String token, Object body) throws Exception {
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (body != null) req.contentType("application/json").content(json.writeValueAsBytes(body));
        return mvc.perform(req);
    }

    private JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }
}
