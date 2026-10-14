package com.marketplace.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

	private final Algorithm algorithm;
	private final Duration expiration;

	public JwtService(@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
		this.algorithm = Algorithm.HMAC256(secret);
		this.expiration = Duration.ofMinutes(expirationMinutes);
	}

	public String issue(Long userId) {
		return JWT.create().withSubject(String.valueOf(userId))
			.withExpiresAt(Instant.now().plus(expiration)).sign(algorithm);
	}

	public Optional<Long> verify(String token) {
		try {
			return Optional.of(Long.valueOf(JWT.require(algorithm).build().verify(token).getSubject()));
		}
		catch (RuntimeException e) {
			return Optional.empty();
		}
	}
}
