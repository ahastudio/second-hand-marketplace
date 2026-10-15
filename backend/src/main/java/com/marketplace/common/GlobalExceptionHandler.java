package com.marketplace.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class GlobalExceptionHandler {

	private static final String VALIDATION_ERROR_CODE = "VALIDATION_ERROR";

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ApiError> handleApiException(ApiException exception) {
		return ResponseEntity.status(exception.getStatus())
			.body(new ApiError(exception.getCode(), exception.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ApiError> handleInvalidRequestFields(MethodArgumentNotValidException exception) {
		return badRequest(firstFieldErrorMessage(exception));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException exception) {
		return badRequest("요청 본문을 읽을 수 없습니다");
	}

	private static String firstFieldErrorMessage(MethodArgumentNotValidException exception) {
		return exception.getBindingResult().getFieldErrors().stream()
			.map(error -> error.getField() + ": " + error.getDefaultMessage())
			.findFirst()
			.orElse("잘못된 요청입니다");
	}

	private static ResponseEntity<ApiError> badRequest(String message) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(VALIDATION_ERROR_CODE, message));
	}
}
