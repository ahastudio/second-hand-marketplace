package com.marketplace.product;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SearchKeywordTest {

	@Test
	void missing_keyword_matches_everything() {
		assertThat(SearchKeyword.of(null).toContainsLikePattern()).isEqualTo("%%");
	}

	@Test
	void surrounding_whitespace_is_trimmed() {
		assertThat(SearchKeyword.of("  iphone  ").toContainsLikePattern()).isEqualTo("%iphone%");
	}

	@Test
	void like_wildcards_and_the_escape_character_are_escaped() {
		assertThat(SearchKeyword.of("100%_sale!").toContainsLikePattern()).isEqualTo("%100!%!_sale!!%");
	}

	@Test
	void keyword_is_cut_to_the_maximum_length() {
		String longKeyword = "a".repeat(150);

		assertThat(SearchKeyword.of(longKeyword).text()).hasSize(100);
	}

	@Test
	void keyword_at_the_maximum_length_is_kept() {
		String maxLengthKeyword = "a".repeat(100);

		assertThat(SearchKeyword.of(maxLengthKeyword).text()).isEqualTo(maxLengthKeyword);
	}
}
