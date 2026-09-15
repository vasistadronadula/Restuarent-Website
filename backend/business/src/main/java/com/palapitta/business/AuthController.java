package com.palapitta.business;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    public record UpdateProfile(@NotBlank @Size(max=120) String fullName,
        @Size(max=25) @Pattern(regexp="[+0-9 ()-]{7,25}|^$") String phone) {}
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @GetMapping("/me")
    public Identity me(@AuthenticationPrincipal Identity identity) {
        return identity;
    }

    @PatchMapping("/me")
    public Identity updateProfile(@Valid @RequestBody UpdateProfile input, @AuthenticationPrincipal Identity identity) {
        return auth.updateProfile(identity, input.fullName(), input.phone());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(value = "Authorization", required = false) String header) {
        if (header != null && header.startsWith("Bearer ")) {
            auth.logout(header.substring(7));
        }
    }
}
