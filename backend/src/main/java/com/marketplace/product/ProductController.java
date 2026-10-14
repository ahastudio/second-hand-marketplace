package com.marketplace.product;

import com.marketplace.product.ProductDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
class ProductController {

	private final ProductService service;

	ProductController(ProductService service) {
		this.service = service;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	ProductResponse create(@AuthenticationPrincipal Long userId, @Valid @RequestBody ProductRequest req) {
		return service.create(userId, req);
	}

	@GetMapping
	ProductPage list(@RequestParam(required = false) String q, @RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return service.list(q, page, size);
	}

	@GetMapping("/{id}")
	ProductResponse get(@PathVariable Long id) {
		return service.get(id);
	}

	@PutMapping("/{id}")
	ProductResponse update(@AuthenticationPrincipal Long userId, @PathVariable Long id,
			@Valid @RequestBody ProductRequest req) {
		return service.update(userId, id, req);
	}

	@PatchMapping("/{id}/status")
	ProductResponse changeStatus(@AuthenticationPrincipal Long userId, @PathVariable Long id,
			@Valid @RequestBody StatusRequest req) {
		return service.changeStatus(userId, id, req.status());
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
		service.delete(userId, id);
	}
}
