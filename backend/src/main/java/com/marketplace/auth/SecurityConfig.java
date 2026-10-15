package com.marketplace.auth;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
class SecurityConfig {

	private static final String ARGON2_ID_ENCODER_ID = "argon2@SpringSecurity_v5_8";
	private static final int ARGON2_SALT_BYTES = 16;
	private static final int ARGON2_HASH_BYTES = 32;
	private static final int ARGON2_PARALLELISM = 1;
	private static final int ARGON2_MEMORY_KIB = 19_456;
	private static final int ARGON2_ITERATIONS = 2;

	private static final String API_PATTERN = "/api/**";
	private static final String API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'";
	private static final List<String> CORS_ALLOWED_METHODS = List.of("GET", "POST", "PUT", "PATCH", "DELETE",
			"OPTIONS");
	private static final List<String> CORS_ALLOWED_HEADERS = List.of("Authorization", "Content-Type");
	private static final long CORS_PREFLIGHT_MAX_AGE_SECONDS = 3600L;

	@Bean
	PasswordEncoder passwordEncoder() {
		PasswordEncoder argon2Id = new Argon2PasswordEncoder(ARGON2_SALT_BYTES, ARGON2_HASH_BYTES, ARGON2_PARALLELISM,
				ARGON2_MEMORY_KIB, ARGON2_ITERATIONS);
		BCryptPasswordEncoder legacyBcrypt = new BCryptPasswordEncoder();
		DelegatingPasswordEncoder encoder = new DelegatingPasswordEncoder(ARGON2_ID_ENCODER_ID,
				Map.of(ARGON2_ID_ENCODER_ID, argon2Id, "bcrypt", legacyBcrypt));
		encoder.setDefaultPasswordEncoderForMatches(legacyBcrypt);
		return encoder;
	}

	@Bean
	UserDetailsService rejectAllUserDetailsService() {
		return username -> {
			throw new UsernameNotFoundException("사용자명 로그인은 지원하지 않습니다");
		};
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(
			@Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(withoutBlankEntries(allowedOrigins));
		configuration.setAllowedMethods(CORS_ALLOWED_METHODS);
		configuration.setAllowedHeaders(CORS_ALLOWED_HEADERS);
		configuration.setMaxAge(CORS_PREFLIGHT_MAX_AGE_SECONDS);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration(API_PATTERN, configuration);
		return source;
	}

	@Bean
	SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService) throws Exception {
		http.cors(Customizer.withDefaults())
			.csrf(AbstractHttpConfigurer::disable)
			.headers(SecurityConfig::applyApiSecurityHeaders)
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.exceptionHandling(handling -> handling
				.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
			.authorizeHttpRequests(SecurityConfig::permitOnlyPublicEndpoints)
			.addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}

	private static List<String> withoutBlankEntries(List<String> values) {
		return values.stream().filter(value -> !value.isBlank()).toList();
	}

	private static void applyApiSecurityHeaders(HeadersConfigurer<HttpSecurity> headers) {
		headers.contentSecurityPolicy(policy -> policy.policyDirectives(API_CONTENT_SECURITY_POLICY))
			.referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER))
			.frameOptions(HeadersConfigurer.FrameOptionsConfig::deny);
	}

	private static void permitOnlyPublicEndpoints(
			AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry requests) {
		requests.requestMatchers("/api/auth/**").permitAll()
			.requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
			.anyRequest().authenticated();
	}
}
