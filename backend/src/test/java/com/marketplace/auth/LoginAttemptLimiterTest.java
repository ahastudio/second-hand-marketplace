package com.marketplace.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.marketplace.common.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class LoginAttemptLimiterTest {

	private static final String EMAIL = "user@example.com";
	private static final int MAX_FAILURES = 3;
	private static final Duration LOCK_DURATION = Duration.ofMinutes(10);

	private final MutableClock clock = new MutableClock();
	private final LoginAttemptLimiter limiter = new LoginAttemptLimiter(MAX_FAILURES, LOCK_DURATION, 2, clock);

	@Test
	void stays_open_until_the_failure_limit_is_reached() {
		failTimes(EMAIL, MAX_FAILURES - 1);

		assertThatCode(() -> limiter.checkAllowed(EMAIL)).doesNotThrowAnyException();
	}

	@Test
	void locks_with_429_once_the_failure_limit_is_reached() {
		failTimes(EMAIL, MAX_FAILURES);

		assertThatThrownBy(() -> limiter.checkAllowed(EMAIL))
			.isInstanceOfSatisfying(ApiException.class, exception -> {
				assertThat(exception.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
				assertThat(exception.getCode()).isEqualTo("TOO_MANY_ATTEMPTS");
			});
	}

	@Test
	void unlocks_after_the_lock_duration() {
		failTimes(EMAIL, MAX_FAILURES);

		clock.advance(LOCK_DURATION.plusSeconds(1));

		assertThatCode(() -> limiter.checkAllowed(EMAIL)).doesNotThrowAnyException();
	}

	@Test
	void success_clears_the_failure_count() {
		failTimes(EMAIL, MAX_FAILURES - 1);
		limiter.recordSuccess(EMAIL);
		failTimes(EMAIL, MAX_FAILURES - 1);

		assertThatCode(() -> limiter.checkAllowed(EMAIL)).doesNotThrowAnyException();
	}

	@Test
	void failures_older_than_the_lock_duration_do_not_add_up() {
		failTimes(EMAIL, MAX_FAILURES - 1);
		clock.advance(LOCK_DURATION.plusSeconds(1));
		limiter.recordFailure(EMAIL);

		assertThatCode(() -> limiter.checkAllowed(EMAIL)).doesNotThrowAnyException();
	}

	@Test
	void failures_of_other_emails_are_counted_separately() {
		failTimes(EMAIL, MAX_FAILURES);

		assertThatCode(() -> limiter.checkAllowed("other@example.com")).doesNotThrowAnyException();
	}

	@Test
	void evicts_stale_records_when_too_many_emails_are_tracked() {
		limiter.recordFailure("a@example.com");
		limiter.recordFailure("b@example.com");
		clock.advance(LOCK_DURATION.plusSeconds(1));
		limiter.recordFailure("c@example.com");
		assertThat(limiter.trackedEmailCount()).isEqualTo(3);

		limiter.recordFailure("d@example.com");

		assertThat(limiter.trackedEmailCount()).isEqualTo(2);
	}

	@Test
	void keeps_recent_records_when_too_many_emails_are_tracked() {
		limiter.recordFailure("a@example.com");
		limiter.recordFailure("b@example.com");
		limiter.recordFailure("c@example.com");

		limiter.recordFailure("d@example.com");

		assertThat(limiter.trackedEmailCount()).isEqualTo(4);
	}

	@Test
	void spring_constructor_uses_the_configured_limits() {
		LoginAttemptLimiter configured = new LoginAttemptLimiter(1, 5);

		configured.recordFailure(EMAIL);

		assertThatThrownBy(() -> configured.checkAllowed(EMAIL)).isInstanceOf(ApiException.class);
	}

	private void failTimes(String email, int times) {
		for (int attempt = 0; attempt < times; attempt++) {
			limiter.recordFailure(email);
		}
	}

	private static final class MutableClock extends Clock {

		private Instant now = Instant.parse("2026-01-01T00:00:00Z");

		void advance(Duration duration) {
			now = now.plus(duration);
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return now;
		}
	}
}
