export type ProductStatus = 'ON_SALE' | 'RESERVED' | 'SOLD'

export interface Product {
  id: number
  title: string
  description: string
  price: number
  status: ProductStatus
  seller: { id: number; nickname: string }
  createdAt: string
  updatedAt: string
}

export const STATUS_LABEL: Record<ProductStatus, string> = {
  ON_SALE: '판매중',
  RESERVED: '예약중',
  SOLD: '판매완료',
}

export const formatPrice = (price: number) => `${price.toLocaleString('ko-KR')}원`
