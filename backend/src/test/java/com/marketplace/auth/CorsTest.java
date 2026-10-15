package com.marketplace.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.marketplace.TestcontainersConfigurationAccess;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "app.cors.allowed-origins=https://app.example.com")
@AutoConfigureMockMvc
@Import(TestcontainersConfigurationAccess.class)
class CorsTest {

	@Autowired
	MockMvc mvc;

	@Test
	void preflight_from_allowed_origin_is_accepted() throws Exception {
		mvc.perform(options("/api/products")
				.header("Origin", "https://app.example.com")
				.header("Access-Control-Request-Method", "POST")
				.header("Access-Control-Request-Headers", "authorization,content-type"))
			.andExpect(status().isOk())
			.andExpect(header().string("Access-Control-Allow-Origin", "https://app.example.com"));
	}

	@Test
	void simple_request_from_allowed_origin_gets_cors_header() throws Exception {
		mvc.perform(get("/api/products").header("Origin", "https://app.example.com"))
			.andExpect(status().isOk())
			.andExpect(header().string("Access-Control-Allow-Origin", "https://app.example.com"));
	}

	@Test
	void request_from_other_origin_is_rejected() throws Exception {
		mvc.perform(get("/api/products").header("Origin", "https://evil.example.com"))
			.andExpect(status().isForbidden());
	}
}
