package com.marketplace.auth;

import com.marketplace.auth.AuthDtos.LoginRequest;
import com.marketplace.auth.AuthDtos.LoginResponse;
import com.marketplace.auth.AuthDtos.SignupRequest;
import com.marketplace.auth.AuthDtos.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class AuthController {

	private final AuthService service;

	AuthController(AuthService service) {
		this.service = service;
	}

	@PostMapping("/auth/signup")
	@ResponseStatus(HttpStatus.CREATED)
	UserResponse signup(@Valid @RequestBody SignupRequest request) {
		return service.signup(request);
	}

	@PostMapping("/auth/login")
	LoginResponse login(@Valid @RequestBody LoginRequest request) {
		return service.login(request);
	}

	@GetMapping("/me")
	UserResponse me(@AuthenticationPrincipal Long userId) {
		return service.me(userId);
	}
}
