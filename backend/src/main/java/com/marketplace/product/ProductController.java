package com.marketplace.product;

import com.marketplace.product.ProductDtos.ProductPage;
import com.marketplace.product.ProductDtos.ProductRequest;
import com.marketplace.product.ProductDtos.ProductResponse;
import com.marketplace.product.ProductDtos.StatusRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
class ProductController {

	private final ProductService service;

	ProductController(ProductService service) {
		this.service = service;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	ProductResponse create(@AuthenticationPrincipal Long userId, @Valid @RequestBody ProductRequest request) {
		return service.create(userId, request);
	}

	@GetMapping
	ProductPage list(@RequestParam(name = "q", required = false) String keyword,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		return service.list(keyword, page, size);
	}

	@GetMapping("/{id}")
	ProductResponse get(@PathVariable("id") Long productId) {
		return service.get(productId);
	}

	@PutMapping("/{id}")
	ProductResponse update(@AuthenticationPrincipal Long userId, @PathVariable("id") Long productId,
			@Valid @RequestBody ProductRequest request) {
		return service.update(userId, productId, request);
	}

	@PatchMapping("/{id}/status")
	ProductResponse changeStatus(@AuthenticationPrincipal Long userId, @PathVariable("id") Long productId,
			@Valid @RequestBody StatusRequest request) {
		return service.changeStatus(userId, productId, request.status());
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@AuthenticationPrincipal Long userId, @PathVariable("id") Long productId) {
		service.delete(userId, productId);
	}
}
