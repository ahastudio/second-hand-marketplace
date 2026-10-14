CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    seller_id   BIGINT        NOT NULL REFERENCES users (id),
    title       VARCHAR(100)  NOT NULL,
    description VARCHAR(2000) NOT NULL DEFAULT '',
    price       INTEGER       NOT NULL CHECK (price >= 0),
    status      VARCHAR(20)   NOT NULL DEFAULT 'ON_SALE',
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_created_at ON products (created_at DESC);
CREATE INDEX idx_products_seller_id ON products (seller_id);
