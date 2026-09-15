package com.palapitta.business;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final AuthService auth = new AuthService(db, new ObjectMapper(), TestTokens.SECRET);
    private final UUID id = UUID.randomUUID();

    @Test void rejectsProfileIdentifiersAsCredentials() {
        assertNull(auth.authenticate(id.toString()));
        assertNull(auth.authenticate("admin@example.com"));
        verifyNoInteractions(db);
    }

    @Test void failsClosedWithoutSigningConfiguration() {
        AuthService unconfigured = new AuthService(db, new ObjectMapper(), "");
        assertNull(unconfigured.authenticate(TestTokens.user(id, "admin@example.com")));
        verifyNoInteractions(db);
    }

    @Test void rejectsMissingExpiredAndFutureClaimsAndWrongAlgorithm() {
        long now = Instant.now().getEpochSecond();
        Map<String,Object> claims = new HashMap<>(Map.of("sub", id.toString(), "role", "authenticated"));
        assertNull(auth.authenticate(TestTokens.sign(Map.of("alg", "HS256"), claims)));
        claims.put("exp", now);
        assertNull(auth.authenticate(TestTokens.sign(Map.of("alg", "HS256"), claims)));
        claims.put("exp", now + 3600);
        claims.put("nbf", now + 300);
        assertNull(auth.authenticate(TestTokens.sign(Map.of("alg", "HS256"), claims)));
        claims.remove("nbf");
        assertNull(auth.authenticate(TestTokens.sign(Map.of("alg", "none"), claims)));
        claims.put("role", "service_role");
        assertNull(auth.authenticate(TestTokens.sign(Map.of("alg", "HS256"), claims)));
        verifyNoInteractions(db);
    }

    @Test void rejectsForgedSignatureAndResolvesValidRoleFromDatabase() {
        String token = TestTokens.user(id, "admin@example.com");
        assertNull(auth.authenticate(token.substring(0, token.lastIndexOf('.') + 1) + "AAAA"));
        when(db.queryForList("SELECT role, full_name FROM public.profiles WHERE id = ?", id))
            .thenReturn(List.of(Map.of("role", "customer", "full_name", "Diner")));
        assertEquals("customer", auth.authenticate(token).role());
    }
}
