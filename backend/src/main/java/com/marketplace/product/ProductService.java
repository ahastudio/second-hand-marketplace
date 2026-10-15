package com.marketplace.product;

import com.marketplace.common.ApiException;
import com.marketplace.product.ProductDtos.ProductPage;
import com.marketplace.product.ProductDtos.ProductRequest;
import com.marketplace.product.ProductDtos.ProductResponse;
import com.marketplace.user.User;
import com.marketplace.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

	private static final int MAX_PAGE_SIZE = 100;
	private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt")
		.and(Sort.by(Sort.Direction.DESC, "id"));

	private final ProductRepository products;
	private final UserRepository users;

	ProductService(ProductRepository products, UserRepository users) {
		this.products = products;
		this.users = users;
	}

	@Transactional
	public ProductResponse create(Long sellerId, ProductRequest request) {
		User seller = users.findById(sellerId).orElseThrow(ApiException::unauthorized);
		Product product = new Product(seller, request.title(), descriptionOrEmpty(request.description()),
				request.price());
		return ProductResponse.from(products.save(product));
	}

	@Transactional(readOnly = true)
	public ProductResponse get(Long productId) {
		return ProductResponse.from(findProduct(productId));
	}

	@Transactional(readOnly = true)
	public ProductPage list(String keyword, int page, int size) {
		String pattern = SearchKeyword.of(keyword).toContainsLikePattern();
		var result = products.searchByTitleLikePattern(pattern, newestFirstPage(page, size));
		return new ProductPage(result.map(ProductResponse::from).getContent(), result.getNumber(), result.getSize(),
				result.getTotalElements());
	}

	@Transactional
	public ProductResponse update(Long userId, Long productId, ProductRequest request) {
		Product product = findOwnedProduct(userId, productId);
		product.revise(request.title(), descriptionOrEmpty(request.description()), request.price());
		return ProductResponse.from(product);
	}

	@Transactional
	public void delete(Long userId, Long productId) {
		products.delete(findOwnedProduct(userId, productId));
	}

	@Transactional
	public ProductResponse changeStatus(Long userId, Long productId, ProductStatus status) {
		Product product = findOwnedProduct(userId, productId);
		product.changeStatus(status);
		return ProductResponse.from(product);
	}

	private Product findProduct(Long productId) {
		return products.findById(productId).orElseThrow(ProductService::productNotFound);
	}

	private Product findOwnedProduct(Long userId, Long productId) {
		Product product = findProduct(productId);
		if (!product.getSeller().getId().equals(userId)) {
			throw notOwner();
		}
		return product;
	}

	private static Pageable newestFirstPage(int page, int size) {
		int nonNegativePage = Math.max(page, 0);
		int sizeWithinLimits = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
		return PageRequest.of(nonNegativePage, sizeWithinLimits, NEWEST_FIRST);
	}

	private static String descriptionOrEmpty(String description) {
		return description == null ? "" : description;
	}

	private static ApiException productNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다");
	}

	private static ApiException notOwner() {
		return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "본인의 상품만 수정하거나 삭제할 수 있습니다");
	}
}
