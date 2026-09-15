package com.palapitta.business;

import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

final class RecordVersion {
    private RecordVersion() {}
    static long parse(String value) {
        if (value == null) return 0; // Legacy callers may omit conditional writes.
        if (!value.matches("\"[1-9][0-9]*\"")) throw new ResponseStatusException(BAD_REQUEST, "Invalid If-Match version");
        try { return Long.parseLong(value.substring(1, value.length() - 1)); }
        catch (NumberFormatException error) { throw new ResponseStatusException(BAD_REQUEST, "Invalid If-Match version"); }
    }
}
