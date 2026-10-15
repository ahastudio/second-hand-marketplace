package com.marketplace.auth;

import com.marketplace.auth.AuthDtos.LoginRequest;
import com.marketplace.auth.AuthDtos.LoginResponse;
import com.marketplace.auth.AuthDtos.SignupRequest;
import com.marketplace.auth.AuthDtos.UserResponse;
import com.marketplace.common.ApiException;
import com.marketplace.user.User;
import com.marketplace.user.UserRepository;
import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

	private static final String PASSWORD_FOR_UNKNOWN_EMAILS = "password-for-unknown-emails";

	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final LoginAttemptLimiter loginAttemptLimiter;
	private final String hashForUnknownEmails;

	AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
			LoginAttemptLimiter loginAttemptLimiter) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.loginAttemptLimiter = loginAttemptLimiter;
		this.hashForUnknownEmails = passwordEncoder.encode(PASSWORD_FOR_UNKNOWN_EMAILS);
	}

	public UserResponse signup(SignupRequest request) {
		String email = normalizeEmail(request.email());
		rejectIfEmailIsTaken(email);
		return UserResponse.from(saveNewUser(email, request));
	}

	@Transactional
	public LoginResponse login(LoginRequest request) {
		String email = normalizeEmail(request.email());
		loginAttemptLimiter.checkAllowed(email);
		User user = authenticate(email, request.password());
		upgradePasswordHashIfOutdated(user, request.password());
		return new LoginResponse(jwtService.issueToken(user.getId()), UserResponse.from(user));
	}

	@Transactional(readOnly = true)
	public UserResponse me(Long userId) {
		return users.findById(userId)
			.map(UserResponse::from)
			.orElseThrow(ApiException::unauthorized);
	}

	private static String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private void rejectIfEmailIsTaken(String email) {
		if (users.existsByEmail(email)) {
			throw emailAlreadyExists();
		}
	}

	private User saveNewUser(String email, SignupRequest request) {
		User user = new User(email, passwordEncoder.encode(request.password()), request.nickname());
		try {
			return users.saveAndFlush(user);
		} catch (DataIntegrityViolationException concurrentSignupWithSameEmail) {
			throw emailAlreadyExists();
		}
	}

	private User authenticate(String email, String rawPassword) {
		Optional<User> user = users.findByEmail(email);
		boolean passwordMatches = matchesStoredOrUnknownEmailHash(rawPassword, user);
		if (user.isEmpty() || !passwordMatches) {
			loginAttemptLimiter.recordFailure(email);
			throw invalidCredentials();
		}
		loginAttemptLimiter.recordSuccess(email);
		return user.get();
	}

	private boolean matchesStoredOrUnknownEmailHash(String rawPassword, Optional<User> user) {
		String hash = user.map(User::getPasswordHash).orElse(hashForUnknownEmails);
		return passwordEncoder.matches(rawPassword, hash);
	}

	private void upgradePasswordHashIfOutdated(User user, String rawPassword) {
		if (passwordEncoder.upgradeEncoding(user.getPasswordHash())) {
			user.replacePasswordHash(passwordEncoder.encode(rawPassword));
		}
	}

	private static ApiException emailAlreadyExists() {
		return new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 가입된 이메일입니다");
	}

	private static ApiException invalidCredentials() {
		return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다");
	}
}
