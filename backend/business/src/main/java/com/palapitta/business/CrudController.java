package com.palapitta.business;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1/data/{resource}")
public class CrudController {
    private final CrudService crud;

    public CrudController(CrudService crud) {
        this.crud = crud;
    }

    @GetMapping
    public Map<String,Object> list(@PathVariable String resource, @AuthenticationPrincipal Identity user,
        @RequestParam(defaultValue = "50") int limit, @RequestParam(defaultValue = "0") int offset) {
        return Map.of("data", crud.list(resource, user, limit, offset), "limit", limit, "offset", offset);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> one(@PathVariable String resource, @PathVariable String id, @AuthenticationPrincipal Identity user) {
        return response(crud.one(resource, id, user), false);
    }

    @PostMapping
    public ResponseEntity<?> create(@PathVariable String resource, @RequestBody Map<String,Object> body, @AuthenticationPrincipal Identity user) {
        return response(crud.create(resource, body, user), true);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String resource, @PathVariable String id,
        @RequestBody Map<String,Object> body,
        @RequestHeader(value = "If-Match", required = false) String ifMatch,
        @AuthenticationPrincipal Identity user) {
        long version = parseVersion(ifMatch);
        return response(crud.update(resource, id, body, version, user), false);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(NO_CONTENT)
    public void delete(@PathVariable String resource, @PathVariable String id,
        @RequestHeader(value = "If-Match", required = false) String ifMatch,
        @AuthenticationPrincipal Identity user) {
        long version = parseVersion(ifMatch);
        crud.delete(resource, id, version, user);
    }

    private ResponseEntity<?> response(Map<String,Object> row, boolean created) {
        Object key = row.containsKey("id") ? row.get("id") : row.get("code");
        String etag = key != null ? "\"" + key + "\"" : "\"1\"";
        return ResponseEntity.status(created ? CREATED : OK).eTag(etag).body(Map.of("data", row));
    }

    private long parseVersion(String value) {
        if (value == null || value.isBlank()) return 1L;
        String clean = value.replace("\"", "").trim();
        try {
            return Long.parseLong(clean);
        } catch (NumberFormatException e) {
            return 1L;
        }
    }
}
