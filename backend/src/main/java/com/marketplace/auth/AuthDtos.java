package com.marketplace.auth;

import com.marketplace.user.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

	private AuthDtos() {
	}

	public record SignupRequest(@NotBlank @Email String email, @NotBlank @Size(min = 8, max = 72) String password,
			@NotBlank @Size(max = 20) String nickname) {
	}

	public record LoginRequest(@NotBlank String email, @NotBlank String password) {
	}

	public record UserResponse(Long id, String email, String nickname) {

		static UserResponse from(User user) {
			return new UserResponse(user.getId(), user.getEmail(), user.getNickname());
		}
	}

	public record LoginResponse(String token, UserResponse user) {
	}
}
