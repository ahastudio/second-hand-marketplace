package com.marketplace.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.util.ServletRequestPathUtils;

class SecurityConfigTest {

	private final SecurityConfig config = new SecurityConfig();

	@Test
	void new_passwords_are_hashed_with_argon2id() {
		String hash = config.passwordEncoder().encode("password123");

		assertThat(hash).startsWith("{argon2@SpringSecurity_v5_8}$argon2id$");
		assertThat(config.passwordEncoder().matches("password123", hash)).isTrue();
		assertThat(config.passwordEncoder().matches("wrong", hash)).isFalse();
	}

	@Test
	void legacy_bcrypt_hash_without_prefix_still_matches_and_is_marked_for_upgrade() {
		PasswordEncoder encoder = config.passwordEncoder();
		String legacyHash = new BCryptPasswordEncoder().encode("password123");

		assertThat(encoder.matches("password123", legacyHash)).isTrue();
		assertThat(encoder.upgradeEncoding(legacyHash)).isTrue();
		assertThat(encoder.upgradeEncoding(encoder.encode("password123"))).isFalse();
	}

	@Test
	void username_login_is_rejected() {
		assertThatThrownBy(() -> config.rejectAllUserDetailsService().loadUserByUsername("anyone"))
			.isInstanceOf(UsernameNotFoundException.class);
	}

	@Test
	void cors_allows_only_the_configured_non_blank_origins() {
		var source = config.corsConfigurationSource(List.of("https://app.example.com", " ", ""));
		var request = new MockHttpServletRequest("GET", "/api/products");
		ServletRequestPathUtils.parseAndCache(request);

		CorsConfiguration cors = source.getCorsConfiguration(request);

		assertThat(cors.getAllowedOrigins()).containsExactly("https://app.example.com");
	}
}
