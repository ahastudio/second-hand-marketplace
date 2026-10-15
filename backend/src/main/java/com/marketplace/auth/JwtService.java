package com.marketplace.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

	static final String ISSUER = "second-hand-marketplace";
	static final int MINIMUM_SECRET_BYTES = 32;

	private final Algorithm algorithm;
	private final Duration tokenLifetime;
	private final JWTVerifier verifier;

	public JwtService(@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
		requireAtLeastMinimumBytes(secret);
		this.algorithm = Algorithm.HMAC256(secret);
		this.tokenLifetime = Duration.ofMinutes(expirationMinutes);
		this.verifier = JWT.require(algorithm).withIssuer(ISSUER).build();
	}

	public String issueToken(Long userId) {
		Instant issuedAt = Instant.now();
		return JWT.create()
			.withIssuer(ISSUER)
			.withSubject(String.valueOf(userId))
			.withIssuedAt(issuedAt)
			.withExpiresAt(issuedAt.plus(tokenLifetime))
			.sign(algorithm);
	}

	public Optional<Long> parseUserId(String token) {
		try {
			return Optional.of(Long.valueOf(verifier.verify(token).getSubject()));
		} catch (RuntimeException invalidToken) {
			return Optional.empty();
		}
	}

	private static void requireAtLeastMinimumBytes(String secret) {
		boolean tooShort = secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MINIMUM_SECRET_BYTES;
		if (tooShort) {
			throw new IllegalStateException("app.jwt.secret은 최소 " + MINIMUM_SECRET_BYTES + "바이트여야 합니다");
		}
	}
}
