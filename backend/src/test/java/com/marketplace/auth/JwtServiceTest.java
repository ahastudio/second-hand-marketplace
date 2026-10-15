package com.marketplace.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class JwtServiceTest {

	private static final String SECRET = "x".repeat(JwtService.MINIMUM_SECRET_BYTES);

	@Test
	void issued_token_resolves_back_to_the_user_id() {
		JwtService service = new JwtService(SECRET, 120);

		assertThat(service.parseUserId(service.issueToken(42L))).contains(42L);
	}

	@Test
	void garbage_token_resolves_to_nothing() {
		assertThat(new JwtService(SECRET, 120).parseUserId("not-a-jwt")).isEmpty();
	}

	@Test
	void expired_token_resolves_to_nothing() {
		JwtService alreadyExpiring = new JwtService(SECRET, -1);

		assertThat(alreadyExpiring.parseUserId(alreadyExpiring.issueToken(1L))).isEmpty();
	}

	@Test
	void token_signed_with_another_secret_resolves_to_nothing() {
		String foreignToken = new JwtService("y".repeat(40), 120).issueToken(1L);

		assertThat(new JwtService(SECRET, 120).parseUserId(foreignToken)).isEmpty();
	}

	@Test
	void missing_secret_is_rejected() {
		assertThatThrownBy(() -> new JwtService(null, 120)).isInstanceOf(IllegalStateException.class);
	}

	@Test
	void secret_shorter_than_minimum_is_rejected() {
		String tooShort = "x".repeat(JwtService.MINIMUM_SECRET_BYTES - 1);

		assertThatThrownBy(() -> new JwtService(tooShort, 120))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("최소");
	}
}
