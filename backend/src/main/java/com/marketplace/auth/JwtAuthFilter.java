package com.marketplace.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

class JwtAuthFilter extends OncePerRequestFilter {

	private static final String BEARER_PREFIX = "Bearer ";

	private final JwtService jwtService;

	JwtAuthFilter(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		extractBearerToken(request)
			.flatMap(jwtService::parseUserId)
			.ifPresent(JwtAuthFilter::authenticateAs);
		chain.doFilter(request, response);
	}

	private static Optional<String> extractBearerToken(HttpServletRequest request) {
		String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
			return Optional.empty();
		}
		return Optional.of(authorization.substring(BEARER_PREFIX.length()));
	}

	private static void authenticateAs(Long userId) {
		SecurityContextHolder.getContext()
			.setAuthentication(new UsernamePasswordAuthenticationToken(userId, null, List.of()));
	}
}
