package com.marketplace.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.marketplace.auth.AuthDtos.LoginRequest;
import com.marketplace.auth.AuthDtos.SignupRequest;
import com.marketplace.common.ApiException;
import com.marketplace.user.User;
import com.marketplace.user.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

	private final UserRepository users = mock(UserRepository.class);
	private final PasswordEncoder passwordEncoder = spy(new BCryptPasswordEncoder(4));
	private final LoginAttemptLimiter limiter = new LoginAttemptLimiter(5, Duration.ofMinutes(10), 100,
			Clock.systemUTC());
	private final AuthService service = new AuthService(users, passwordEncoder,
			new JwtService("x".repeat(40), 120), limiter);

	@Test
	void login_with_unknown_email_still_verifies_a_password_hash() {
		when(users.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.login(new LoginRequest("nobody@example.com", "any-password")))
			.isInstanceOf(ApiException.class);

		verify(passwordEncoder).matches(eq("any-password"), anyString());
	}

	@Test
	void login_with_unknown_email_counts_as_a_failure() {
		when(users.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

		for (int attempt = 0; attempt < 5; attempt++) {
			assertThatThrownBy(() -> service.login(new LoginRequest("nobody@example.com", "x")))
				.hasMessageContaining("올바르지 않습니다");
		}

		assertThatThrownBy(() -> service.login(new LoginRequest("nobody@example.com", "x")))
			.hasMessageContaining("너무 많습니다");
		assertThat(limiter.trackedEmailCount()).isEqualTo(1);
	}

	@Test
	void signup_losing_a_race_on_the_same_email_is_reported_as_conflict() {
		when(users.existsByEmail("race@example.com")).thenReturn(false);
		when(users.saveAndFlush(any(User.class))).thenThrow(new DataIntegrityViolationException("unique violation"));

		assertThatThrownBy(() -> service.signup(new SignupRequest("race@example.com", "password123", "경쟁")))
			.isInstanceOfSatisfying(ApiException.class, exception -> {
				assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				assertThat(exception.getCode()).isEqualTo("EMAIL_ALREADY_EXISTS");
			});
	}
}
