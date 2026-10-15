package com.marketplace.product;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.marketplace.TestcontainersConfigurationAccess;
import com.marketplace.auth.JwtService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfigurationAccess.class)
class ProductApiTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JwtService jwtService;

	private String tokenFor(String nickname) throws Exception {
		String email = "p-" + UUID.randomUUID() + "@example.com";
		mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"%s\"}".formatted(email, nickname)));
		String res = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"password\":\"password123\"}".formatted(email)))
			.andReturn().getResponse().getContentAsString();
		return JsonPath.read(res, "$.token");
	}

	private static final String BODY = "{\"title\":\"아이폰\",\"description\":\"새 제품\",\"price\":850000}";

	@Test
	void create_returns_201_with_product_and_seller() throws Exception {
		String token = tokenFor("판매왕");
		mvc.perform(post("/api/products").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content(BODY))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id", notNullValue()))
			.andExpect(jsonPath("$.title").value("아이폰"))
			.andExpect(jsonPath("$.price").value(850000))
			.andExpect(jsonPath("$.status").value("ON_SALE"))
			.andExpect(jsonPath("$.seller.nickname").value("판매왕"))
			.andExpect(jsonPath("$.createdAt", notNullValue()));
	}

	@Test
	void create_without_token_returns_401() throws Exception {
		mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content(BODY))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void create_with_invalid_body_returns_400() throws Exception {
		String token = tokenFor("판매왕");
		mvc.perform(post("/api/products").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"\",\"description\":\"x\",\"price\":-1}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void get_detail_is_public_and_returns_product() throws Exception {
		String token = tokenFor("판매왕");
		String created = mvc.perform(post("/api/products").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content(BODY))
			.andReturn().getResponse().getContentAsString();
		int id = JsonPath.read(created, "$.id");

		mvc.perform(get("/api/products/" + id))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("아이폰"))
			.andExpect(jsonPath("$.seller.nickname").value("판매왕"));
	}

	@Test
	void get_detail_of_unknown_product_returns_404() throws Exception {
		mvc.perform(get("/api/products/99999999"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
	}

	private void createProduct(String token, String title) throws Exception {
		mvc.perform(post("/api/products").header("Authorization", "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"title\":\"%s\",\"description\":\"d\",\"price\":1000}".formatted(title)));
	}

	@Test
	void list_is_public_newest_first_and_filters_by_title_keyword() throws Exception {
		String token = tokenFor("판매왕");
		String key = "kw" + UUID.randomUUID().toString().replace("-", "");
		createProduct(token, key + " first");
		createProduct(token, key + " second");
		createProduct(token, "unrelated " + UUID.randomUUID());

		mvc.perform(get("/api/products").param("q", key.toUpperCase()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.total").value(2))
			.andExpect(jsonPath("$.items.length()").value(2))
			.andExpect(jsonPath("$.items[0].title").value(key + " second"))
			.andExpect(jsonPath("$.items[1].title").value(key + " first"))
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.size").value(20));
	}

	@Test
	void list_paginates() throws Exception {
		String token = tokenFor("판매왕");
		String key = "pg" + UUID.randomUUID().toString().replace("-", "");
		for (int i = 0; i < 3; i++) {
			createProduct(token, key + " " + i);
		}
		mvc.perform(get("/api/products").param("q", key).param("size", "2").param("page", "1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.total").value(3))
			.andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.items[0].title").value(key + " 0"));
	}

	@Test
	void list_with_no_match_returns_empty_items() throws Exception {
		mvc.perform(get("/api/products").param("q", "nomatch" + UUID.randomUUID()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.total").value(0))
			.andExpect(jsonPath("$.items.length()").value(0));
	}

	private int createAndGetId(String token, String title) throws Exception {
		String res = mvc.perform(post("/api/products").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"%s\",\"description\":\"d\",\"price\":1000}".formatted(title)))
			.andReturn().getResponse().getContentAsString();
		return JsonPath.read(res, "$.id");
	}

	private static final String UPDATE = "{\"title\":\"수정됨\",\"description\":\"새 설명\",\"price\":2500}";

	@Test
	void owner_can_update_product() throws Exception {
		String token = tokenFor("판매왕");
		int id = createAndGetId(token, "원래 제목");
		mvc.perform(put("/api/products/" + id).header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content(UPDATE))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("수정됨"))
			.andExpect(jsonPath("$.description").value("새 설명"))
			.andExpect(jsonPath("$.price").value(2500));
		mvc.perform(get("/api/products/" + id)).andExpect(jsonPath("$.title").value("수정됨"));
	}

	@Test
	void update_by_non_owner_returns_403_and_does_not_change() throws Exception {
		int id = createAndGetId(tokenFor("판매왕"), "원래 제목");
		mvc.perform(put("/api/products/" + id).header("Authorization", "Bearer " + tokenFor("타인"))
				.contentType(MediaType.APPLICATION_JSON).content(UPDATE))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
		mvc.perform(get("/api/products/" + id)).andExpect(jsonPath("$.title").value("원래 제목"));
	}

	@Test
	void update_without_token_returns_401() throws Exception {
		int id = createAndGetId(tokenFor("판매왕"), "t");
		mvc.perform(put("/api/products/" + id).contentType(MediaType.APPLICATION_JSON).content(UPDATE))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void update_unknown_returns_404_and_invalid_returns_400() throws Exception {
		String token = tokenFor("판매왕");
		mvc.perform(put("/api/products/99999999").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content(UPDATE))
			.andExpect(status().isNotFound());
		int id = createAndGetId(token, "t");
		mvc.perform(put("/api/products/" + id).header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"\",\"price\":-5}"))
			.andExpect(status().isBadRequest());
	}

	@Test
	void owner_can_delete_product() throws Exception {
		String token = tokenFor("판매왕");
		int id = createAndGetId(token, "삭제될 상품");
		mvc.perform(delete("/api/products/" + id).header("Authorization", "Bearer " + token))
			.andExpect(status().isNoContent());
		mvc.perform(get("/api/products/" + id)).andExpect(status().isNotFound());
	}

	@Test
	void delete_by_non_owner_returns_403_and_keeps_product() throws Exception {
		int id = createAndGetId(tokenFor("판매왕"), "유지될 상품");
		mvc.perform(delete("/api/products/" + id).header("Authorization", "Bearer " + tokenFor("타인")))
			.andExpect(status().isForbidden());
		mvc.perform(get("/api/products/" + id)).andExpect(status().isOk());
	}

	@Test
	void delete_without_token_401_and_unknown_404() throws Exception {
		int id = createAndGetId(tokenFor("판매왕"), "t");
		mvc.perform(delete("/api/products/" + id)).andExpect(status().isUnauthorized());
		mvc.perform(delete("/api/products/99999999").header("Authorization", "Bearer " + tokenFor("판매왕")))
			.andExpect(status().isNotFound());
	}

	@Test
	void owner_can_change_status_freely() throws Exception {
		String token = tokenFor("판매왕");
		int id = createAndGetId(token, "상태 테스트");
		for (String status : new String[] {"RESERVED", "SOLD", "ON_SALE"}) {
			mvc.perform(patch("/api/products/" + id + "/status").header("Authorization", "Bearer " + token)
					.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"%s\"}".formatted(status)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value(status));
			mvc.perform(get("/api/products/" + id)).andExpect(jsonPath("$.status").value(status));
		}
	}

	@Test
	void status_change_by_non_owner_returns_403() throws Exception {
		int id = createAndGetId(tokenFor("판매왕"), "t");
		mvc.perform(patch("/api/products/" + id + "/status").header("Authorization", "Bearer " + tokenFor("타인"))
				.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"SOLD\"}"))
			.andExpect(status().isForbidden());
		mvc.perform(get("/api/products/" + id)).andExpect(jsonPath("$.status").value("ON_SALE"));
	}

	@Test
	void status_change_rejects_invalid_unauthenticated_and_unknown() throws Exception {
		String token = tokenFor("판매왕");
		int id = createAndGetId(token, "t");
		mvc.perform(patch("/api/products/" + id + "/status").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"NOPE\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
		mvc.perform(patch("/api/products/" + id + "/status").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isBadRequest());
		mvc.perform(patch("/api/products/" + id + "/status").contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\":\"SOLD\"}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(patch("/api/products/99999999/status").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"SOLD\"}"))
			.andExpect(status().isNotFound());
	}

	@Test
	void create_with_token_of_unknown_user_returns_401() throws Exception {
		String tokenOfDeletedUser = jwtService.issueToken(Long.MAX_VALUE);
		mvc.perform(post("/api/products").header("Authorization", "Bearer " + tokenOfDeletedUser)
				.contentType(MediaType.APPLICATION_JSON).content(BODY))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void update_without_description_stores_empty_description() throws Exception {
		String token = tokenFor("판매왕");
		int id = createAndGetId(token, "설명 없는 수정");
		mvc.perform(put("/api/products/" + id).header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"수정\",\"price\":1}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.description").value(""));
	}

	@Test
	void list_corrects_out_of_range_page_and_size() throws Exception {
		mvc.perform(get("/api/products").param("page", "-5").param("size", "0"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.size").value(1));
		mvc.perform(get("/api/products").param("size", "1000"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.size").value(100));
	}
}
