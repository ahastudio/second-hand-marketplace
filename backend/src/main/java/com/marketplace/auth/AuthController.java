package com.marketplace.auth;

import com.marketplace.auth.AuthDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class AuthController {

	private final AuthService service;

	AuthController(AuthService service) {
		this.service = service;
	}

	@PostMapping("/auth/signup")
	@ResponseStatus(HttpStatus.CREATED)
	UserResponse signup(@Valid @RequestBody SignupRequest req) {
		return service.signup(req);
	}

	@PostMapping("/auth/login")
	LoginResponse login(@Valid @RequestBody LoginRequest req) {
		return service.login(req);
	}

	@GetMapping("/me")
	UserResponse me(@AuthenticationPrincipal Long userId) {
		return service.me(userId);
	}
}
