package com.palapitta.business;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class AuthService {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final String jwtSecret;

    public AuthService(JdbcTemplate db, ObjectMapper json,
                       @Value("${supabase.jwt.secret:}") String jwtSecret) {
        this.db = db;
        this.json = json;
        this.jwtSecret = jwtSecret != null ? jwtSecret.trim() : "";
    }

    public Identity authenticate(String token) {
        if (token == null || token.isBlank() || jwtSecret.isEmpty()) return null;
        String[] parts = token.split("\\.", -1);
        if (parts.length != 3) return null;

        try {
            // Never accept unsigned credentials or synthetic UUID/email tokens.
            JsonNode header = json.readTree(Base64.getUrlDecoder().decode(parts[0]));
            if (!"HS256".equals(header.path("alg").asText())) return null;
            {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                byte[] expected = mac.doFinal((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
                byte[] signature = Base64.getUrlDecoder().decode(parts[2]);
                if (!MessageDigest.isEqual(expected, signature)) {
                    return null;
                }
            }

            // 2. Decode payload
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode payload = json.readTree(payloadBytes);

            // 3. Check expiration
            long now = Instant.now().getEpochSecond();
            if (!payload.path("exp").isIntegralNumber() || payload.path("exp").asLong() <= now) return null;
            if (payload.has("nbf") && (!payload.path("nbf").isIntegralNumber() || payload.path("nbf").asLong() > now)) return null;
            if (!"authenticated".equals(payload.path("role").asText())) return null;
            // Bind the token to this project's auth server when the claims
            // carry audience/issuer, so a token minted for another Supabase
            // project can never authenticate here.
            if (payload.has("aud") && !"authenticated".equals(payload.path("aud").asText())) return null;
            if (payload.has("iss") && !payload.path("iss").asText().contains("supabase")) return null;

            // 4. Extract user ID (sub)
            if (!payload.has("sub")) return null;
            UUID userId = UUID.fromString(payload.get("sub").asText());
            String email = payload.has("email") ? payload.get("email").asText() : "";

            // 5. Query user profile from public.profiles
            String role = "customer";
            String fullName = email;
            try {
                List<Map<String, Object>> rows = db.queryForList(
                    "SELECT role, full_name FROM public.profiles WHERE id = ?", userId);
                if (!rows.isEmpty()) {
                    Map<String, Object> p = rows.getFirst();
                    if (p.get("role") != null && !p.get("role").toString().isBlank()) {
                        role = p.get("role").toString();
                    }
                    if (p.get("full_name") != null && !p.get("full_name").toString().isBlank()) {
                        fullName = p.get("full_name").toString();
                    }
                } else if (payload.has("user_metadata")) {
                    JsonNode meta = payload.get("user_metadata");
                    if (meta.has("full_name")) fullName = meta.get("full_name").asText();
                }
            } catch (Exception ignored) {
                return null;
            }

            return new Identity(userId, email, fullName, role);
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public Identity updateProfile(Identity identity, String fullName, String phone) {
        db.update("UPDATE public.profiles SET full_name = ?, phone = ?, updated_at = now() WHERE id = ?",
            fullName.strip(), phone == null ? null : phone.strip(), identity.id());
        return new Identity(identity.id(), identity.email(), fullName.strip(), identity.role());
    }

    public void logout(String token) {
        // Supabase JWTs are stateless on the backend; client drops session
    }

    public Map<String, Object> register(String email, String password, String name) {
        throw new ResponseStatusException(BAD_REQUEST,
            "Please register using Supabase Auth on the frontend.");
    }

    public Map<String, Object> login(String email, String password) {
        throw new ResponseStatusException(BAD_REQUEST,
            "Please log in using Supabase Auth on the frontend.");
    }

}
