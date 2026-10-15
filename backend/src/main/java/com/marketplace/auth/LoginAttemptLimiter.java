package com.marketplace.auth;

import com.marketplace.common.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
class LoginAttemptLimiter {

	static final int DEFAULT_MAX_TRACKED_EMAILS = 10_000;

	private final ConcurrentHashMap<String, FailureRecord> failuresByEmail = new ConcurrentHashMap<>();
	private final int maxFailures;
	private final Duration lockDuration;
	private final int maxTrackedEmails;
	private final Clock clock;

	@Autowired
	LoginAttemptLimiter(@Value("${app.security.login-max-failures}") int maxFailures,
			@Value("${app.security.login-lock-minutes}") long lockMinutes) {
		this(maxFailures, Duration.ofMinutes(lockMinutes), DEFAULT_MAX_TRACKED_EMAILS, Clock.systemUTC());
	}

	LoginAttemptLimiter(int maxFailures, Duration lockDuration, int maxTrackedEmails, Clock clock) {
		this.maxFailures = maxFailures;
		this.lockDuration = lockDuration;
		this.maxTrackedEmails = maxTrackedEmails;
		this.clock = clock;
	}

	void checkAllowed(String email) {
		FailureRecord record = failuresByEmail.get(email);
		if (record != null && record.isLockedAt(clock.instant())) {
			throw tooManyAttempts();
		}
	}

	void recordFailure(String email) {
		Instant now = clock.instant();
		evictStaleRecordsWhenOverCapacity(now);
		failuresByEmail.compute(email, (key, previous) -> nextRecord(previous, now));
	}

	void recordSuccess(String email) {
		failuresByEmail.remove(email);
	}

	private FailureRecord nextRecord(FailureRecord previous, Instant now) {
		int failures = previous == null || isStale(previous, now) ? 1 : previous.failures() + 1;
		Instant lockedUntil = failures >= maxFailures ? now.plus(lockDuration) : null;
		return new FailureRecord(failures, lockedUntil, now);
	}

	private void evictStaleRecordsWhenOverCapacity(Instant now) {
		if (failuresByEmail.size() > maxTrackedEmails) {
			failuresByEmail.values().removeIf(record -> isStale(record, now));
		}
	}

	int trackedEmailCount() {
		return failuresByEmail.size();
	}

	private boolean isStale(FailureRecord record, Instant now) {
		return record.lastFailureAt().plus(lockDuration).isBefore(now);
	}

	private static ApiException tooManyAttempts() {
		return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
				"로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요");
	}

	private record FailureRecord(int failures, Instant lockedUntil, Instant lastFailureAt) {

		boolean isLockedAt(Instant now) {
			return lockedUntil != null && lockedUntil.isAfter(now);
		}
	}
}
