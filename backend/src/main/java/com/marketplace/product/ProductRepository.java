package com.marketplace.product;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

	@Query("select p from Product p where lower(p.title) like lower(:pattern) escape '"
			+ SearchKeyword.LIKE_ESCAPE_CHARACTER + "'")
	Page<Product> searchByTitleLikePattern(@Param("pattern") String pattern, Pageable pageable);
}
