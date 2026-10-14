package com.marketplace.auth;

import com.marketplace.auth.AuthDtos.*;
import com.marketplace.common.ApiException;
import com.marketplace.user.User;
import com.marketplace.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

	private final UserRepository users;
	private final PasswordEncoder encoder;
	private final JwtService jwt;

	AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
		this.users = users;
		this.encoder = encoder;
		this.jwt = jwt;
	}

	public UserResponse signup(SignupRequest req) {
		if (users.existsByEmail(req.email())) {
			throw emailExists();
		}
		try {
			User saved = users.saveAndFlush(new User(req.email(), encoder.encode(req.password()), req.nickname()));
			return toResponse(saved);
		}
		catch (DataIntegrityViolationException e) {
			throw emailExists();
		}
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest req) {
		User user = users.findByEmail(req.email())
			.filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
			.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
					"이메일 또는 비밀번호가 올바르지 않습니다"));
		return new LoginResponse(jwt.issue(user.getId()), toResponse(user));
	}

	@Transactional(readOnly = true)
	public UserResponse me(Long userId) {
		return users.findById(userId).map(this::toResponse)
			.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증이 필요합니다"));
	}

	private ApiException emailExists() {
		return new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 가입된 이메일입니다");
	}

	private UserResponse toResponse(User u) {
		return new UserResponse(u.getId(), u.getEmail(), u.getNickname());
	}
}
