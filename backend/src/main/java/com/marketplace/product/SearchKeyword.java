package com.marketplace.product;

record SearchKeyword(String text) {

	static final String LIKE_ESCAPE_CHARACTER = "!";
	private static final int MAX_LENGTH = 100;

	static SearchKeyword of(String rawText) {
		String trimmed = rawText == null ? "" : rawText.trim();
		return new SearchKeyword(truncate(trimmed));
	}

	String toContainsLikePattern() {
		return "%" + escapeLikeWildcards(text) + "%";
	}

	private static String truncate(String text) {
		return text.length() > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text;
	}

	private static String escapeLikeWildcards(String text) {
		return text.replace(LIKE_ESCAPE_CHARACTER, LIKE_ESCAPE_CHARACTER + LIKE_ESCAPE_CHARACTER)
			.replace("%", LIKE_ESCAPE_CHARACTER + "%")
			.replace("_", LIKE_ESCAPE_CHARACTER + "_");
	}
}
