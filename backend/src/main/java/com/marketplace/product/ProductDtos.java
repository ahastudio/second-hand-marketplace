package com.marketplace.product;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class ProductDtos {

	private ProductDtos() {
	}

	public record ProductRequest(@NotBlank @Size(max = 100) String title, @Size(max = 2000) String description,
			@NotNull @Min(0) Integer price) {
	}

	public record StatusRequest(@NotNull ProductStatus status) {
	}

	public record SellerResponse(Long id, String nickname) {
	}

	public record ProductResponse(Long id, String title, String description, int price, ProductStatus status,
			SellerResponse seller, Instant createdAt, Instant updatedAt) {

		static ProductResponse from(Product p) {
			return new ProductResponse(p.getId(), p.getTitle(), p.getDescription(), p.getPrice(), p.getStatus(),
					new SellerResponse(p.getSeller().getId(), p.getSeller().getNickname()), p.getCreatedAt(),
					p.getUpdatedAt());
		}
	}

	public record ProductPage(List<ProductResponse> items, int page, int size, long total) {
	}
}
