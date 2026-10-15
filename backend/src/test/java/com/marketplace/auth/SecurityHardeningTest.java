package com.marketplace.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.marketplace.TestcontainersConfigurationAccess;
import com.marketplace.user.User;
import com.marketplace.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfigurationAccess.class)
class SecurityHardeningTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	UserRepository users;

	private String email() {
		return "s-" + UUID.randomUUID() + "@example.com";
	}

	private void signup(String email) throws Exception {
		mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"보안\"}".formatted(email)))
			.andExpect(status().isCreated());
	}

	private org.springframework.test.web.servlet.ResultActions login(String email, String password) throws Exception {
		return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
	}

	@Test
	void password_is_stored_as_argon2() throws Exception {
		String email = email();
		signup(email);
		String hash = users.findByEmail(email).orElseThrow().getPasswordHash();
		assertThat(hash).startsWith("{argon2@SpringSecurity_v5_8}$argon2id$");
		assertThat(hash).doesNotContain("password123");
	}

	@Test
	void legacy_bcrypt_hash_still_logs_in_and_is_upgraded_to_argon2() throws Exception {
		String email = email();
		users.saveAndFlush(new User(email, new BCryptPasswordEncoder().encode("password123"), "레거시"));
		login(email, "password123").andExpect(status().isOk());
		assertThat(users.findByEmail(email).orElseThrow().getPasswordHash()).startsWith("{argon2@");
		login(email, "password123").andExpect(status().isOk());
	}

	@Test
	void email_is_case_insensitive() throws Exception {
		String email = email();
		signup(email.toUpperCase());
		login(email, "password123").andExpect(status().isOk());
		mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"중복\"}".formatted(email)))
			.andExpect(status().isConflict());
	}

	@Test
	void repeated_login_failures_lock_the_account_temporarily() throws Exception {
		String email = email();
		signup(email);
		for (int i = 0; i < 5; i++) {
			login(email, "wrong-password").andExpect(status().isUnauthorized());
		}
		login(email, "wrong-password").andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
		login(email, "password123").andExpect(status().isTooManyRequests());
	}

	@Test
	void successful_login_resets_failure_count() throws Exception {
		String email = email();
		signup(email);
		for (int i = 0; i < 4; i++) {
			login(email, "wrong-password").andExpect(status().isUnauthorized());
		}
		login(email, "password123").andExpect(status().isOk());
		for (int i = 0; i < 4; i++) {
			login(email, "wrong-password").andExpect(status().isUnauthorized());
		}
	}

	@Test
	void api_responses_carry_security_headers() throws Exception {
		mvc.perform(get("/api/products"))
			.andExpect(status().isOk())
			.andExpect(header().string("X-Content-Type-Options", "nosniff"))
			.andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
			.andExpect(header().string("Referrer-Policy", "no-referrer"))
			.andExpect(header().string("X-Frame-Options", "DENY"))
			.andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
	}

	@Test
	void unauthenticated_error_does_not_leak_details() throws Exception {
		mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/products/not-a-number"))
			.andExpect(status().is4xxClientError())
			.andExpect(jsonPath("$.trace").doesNotExist())
			.andExpect(jsonPath("$.exception").doesNotExist());
	}

	@Test
	void search_wildcards_are_treated_literally() throws Exception {
		String email = email();
		signup(email);
		String token = JsonPath.read(login(email, "password123").andReturn().getResponse().getContentAsString(),
				"$.token");
		String unique = "wc" + UUID.randomUUID().toString().substring(0, 8);
		mvc.perform(post("/api/products").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"%s item\",\"description\":\"d\",\"price\":1000}".formatted(unique)))
			.andExpect(status().isCreated());
		expectSearchTotal(unique.substring(0, 4) + "%", 0);
		expectSearchTotal("_".repeat(3), 0);
		expectSearchTotal(unique, 1);
	}

	private void expectSearchTotal(String keyword, int expectedTotal) throws Exception {
		mvc.perform(get("/api/products").param("q", keyword))
			.andExpect(jsonPath("$.total").value(expectedTotal));
	}

	@Test
	void jwt_with_wrong_issuer_or_weak_secret_is_rejected() {
		String secret = "x".repeat(40);
		JwtService service = new JwtService(secret, 120);
		String foreign = com.auth0.jwt.JWT.create().withSubject("1").withIssuer("someone-else")
			.withExpiresAt(java.time.Instant.now().plusSeconds(60))
			.sign(com.auth0.jwt.algorithms.Algorithm.HMAC256(secret));
		assertThat(service.parseUserId(foreign)).isEmpty();
		assertThat(service.parseUserId(service.issueToken(7L))).contains(7L);
		org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> new JwtService("short", 120));
	}
}
