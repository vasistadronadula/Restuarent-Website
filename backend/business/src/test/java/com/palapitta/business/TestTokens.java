package com.palapitta.business;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

final class TestTokens {
    static final String SECRET = "test-supabase-jwt-secret-key-for-unit-tests-12345";

    static String user(UUID id, String email) {
        return sign(Map.of("alg", "HS256", "typ", "JWT"), Map.of(
            "sub", id.toString(), "email", email, "role", "authenticated",
            "exp", Instant.now().plusSeconds(3600).getEpochSecond()));
    }

    static String sign(Map<String,Object> header, Map<String,Object> payload) {
        try {
            ObjectMapper json = new ObjectMapper();
            Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
            String data = encoder.encodeToString(json.writeValueAsBytes(header)) + "."
                + encoder.encodeToString(json.writeValueAsBytes(payload));
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return data + "." + encoder.encodeToString(mac.doFinal(data.getBytes(StandardCharsets.US_ASCII)));
        } catch (Exception error) { throw new IllegalStateException(error); }
    }
}
