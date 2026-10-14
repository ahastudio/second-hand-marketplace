package com.marketplace.product;

import com.marketplace.common.ApiException;
import com.marketplace.product.ProductDtos.*;
import com.marketplace.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

	private final ProductRepository products;
	private final UserRepository users;

	ProductService(ProductRepository products, UserRepository users) {
		this.products = products;
		this.users = users;
	}

	@Transactional
	public ProductResponse create(Long sellerId, ProductRequest req) {
		var seller = users.findById(sellerId)
			.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증이 필요합니다"));
		String description = req.description() == null ? "" : req.description();
		return ProductResponse.from(products.save(new Product(seller, req.title(), description, req.price())));
	}

	@Transactional(readOnly = true)
	public ProductResponse get(Long id) {
		return ProductResponse.from(products.findById(id)
			.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다")));
	}

	@Transactional(readOnly = true)
	public ProductPage list(String q, int page, int size) {
		var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
				Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
		var result = products.search(q == null ? "" : q.trim(), pageable);
		return new ProductPage(result.map(ProductResponse::from).getContent(), result.getNumber(), result.getSize(),
				result.getTotalElements());
	}

	@Transactional
	public ProductResponse update(Long userId, Long id, ProductRequest req) {
		Product product = findOwned(userId, id);
		product.update(req.title(), req.description() == null ? "" : req.description(), req.price());
		return ProductResponse.from(product);
	}

	@Transactional
	public void delete(Long userId, Long id) {
		products.delete(findOwned(userId, id));
	}

	@Transactional
	public ProductResponse changeStatus(Long userId, Long id, ProductStatus status) {
		Product product = findOwned(userId, id);
		product.changeStatus(status);
		return ProductResponse.from(product);
	}

	private Product findOwned(Long userId, Long id) {
		Product product = products.findById(id)
			.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다"));
		if (!product.getSeller().getId().equals(userId)) {
			throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "본인의 상품만 수정하거나 삭제할 수 있습니다");
		}
		return product;
	}
}
