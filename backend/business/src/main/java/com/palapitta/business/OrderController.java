package com.palapitta.business;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    public record Status(@NotNull @Pattern(regexp="preparing|ready|delivered|cancelled") String status) {}
    private final OrderService orders;

    public OrderController(OrderService orders) {
        this.orders = orders;
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@Valid @RequestBody OrderService.Checkout input,
        @RequestHeader(value = "Idempotency-Key", required = false) String key,
        @AuthenticationPrincipal Identity user) {
        return response(orders.checkout(input, key, user));
    }

    @GetMapping
    public Map<String,Object> list(@AuthenticationPrincipal Identity user,
        @RequestParam(defaultValue = "50") int limit,
        @RequestParam(defaultValue = "0") int offset,
        @RequestParam(required = false) Instant from,
        @RequestParam(required = false) Instant to) {
        return Map.of("data", orders.list(user, limit, offset, from, to));
    }

    @GetMapping("/floor")
    public Map<String,Object> floor(@AuthenticationPrincipal Identity user) {
        return Map.of("data", orders.floorOrders(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> one(@PathVariable String id, @AuthenticationPrincipal Identity user) {
        return response(orders.one(id, user));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> status(@PathVariable String id,
        @Valid @RequestBody Status input,
        @AuthenticationPrincipal Identity user) {
        return response(orders.status(id, input.status(), user));
    }

    @PostMapping("/{id}/cash-payment")
    public ResponseEntity<?> cash(@PathVariable String id,
        @AuthenticationPrincipal Identity user) {
        return response(orders.collectCash(id, user));
    }

    public record PrepInput(int delayMinutes, String notes) {}

    @PatchMapping("/{id}/prep")
    public ResponseEntity<?> prep(@PathVariable String id,
        @RequestBody PrepInput input,
        @AuthenticationPrincipal Identity user) {
        return response(orders.updatePrep(id, input.delayMinutes(), input.notes(), user));
    }

    private ResponseEntity<?> response(Map<String,Object> row) {
        String etag = row.get("id") != null ? "\"" + row.get("id") + "\"" : "\"1\"";
        return ResponseEntity.ok().eTag(etag).body(Map.of("data", row));
    }
}
