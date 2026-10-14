package com.marketplace.product;

import com.marketplace.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "products")
public class Product {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(optional = false, fetch = FetchType.EAGER)
	@JoinColumn(name = "seller_id")
	private User seller;

	@Column(nullable = false)
	private String title;

	@Column(nullable = false)
	private String description;

	@Column(nullable = false)
	private int price;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ProductStatus status = ProductStatus.ON_SALE;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt = createdAt;

	protected Product() {
	}

	public Product(User seller, String title, String description, int price) {
		this.seller = seller;
		this.title = title;
		this.description = description;
		this.price = price;
	}

	public void update(String title, String description, int price) {
		this.title = title;
		this.description = description;
		this.price = price;
		this.updatedAt = Instant.now();
	}

	public void changeStatus(ProductStatus status) {
		this.status = status;
		this.updatedAt = Instant.now();
	}

	public Long getId() { return id; }
	public User getSeller() { return seller; }
	public String getTitle() { return title; }
	public String getDescription() { return description; }
	public int getPrice() { return price; }
	public ProductStatus getStatus() { return status; }
	public Instant getCreatedAt() { return createdAt; }
	public Instant getUpdatedAt() { return updatedAt; }
}
