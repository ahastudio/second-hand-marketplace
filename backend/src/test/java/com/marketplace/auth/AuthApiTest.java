package com.marketplace.auth;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.marketplace.TestcontainersConfigurationAccess;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfigurationAccess.class)
class AuthApiTest {

	@Autowired
	MockMvc mvc;

	private String email() {
		return "u-" + UUID.randomUUID() + "@example.com";
	}

	private String signupBody(String email, String password, String nickname) {
		return "{\"email\":\"%s\",\"password\":\"%s\",\"nickname\":\"%s\"}".formatted(email, password, nickname);
	}

	private void signup(String email) throws Exception {
		mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
				.content(signupBody(email, "password123", "판매왕")))
			.andExpect(status().isCreated());
	}

	@Test
	void signup_succeeds_and_does_not_expose_password() throws Exception {
		mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
				.content(signupBody(email(), "password123", "판매왕")))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id", notNullValue()))
			.andExpect(jsonPath("$.nickname").value("판매왕"))
			.andExpect(jsonPath("$.password").doesNotExist())
			.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	void signup_duplicate_email_returns_409() throws Exception {
		String email = email();
		signup(email);
		mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
				.content(signupBody(email, "password123", "다른사람")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
			.andExpect(jsonPath("$.message").value("이미 가입된 이메일입니다"));
	}

	@Test
	void signup_validation_failure_returns_400() throws Exception {
		mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
				.content(signupBody("not-an-email", "short", "")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void login_returns_token_and_me_returns_user() throws Exception {
		String email = email();
		signup(email);
		String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"password\":\"password123\"}".formatted(email)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token", notNullValue()))
			.andReturn().getResponse().getContentAsString();
		String token = JsonPath.read(response, "$.token");

		mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(email))
			.andExpect(jsonPath("$.nickname").value("판매왕"));
	}

	@Test
	void login_with_wrong_password_returns_401() throws Exception {
		String email = email();
		signup(email);
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"password\":\"wrong-password\"}".formatted(email)))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	void me_without_token_returns_401() throws Exception {
		mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
	}
}
