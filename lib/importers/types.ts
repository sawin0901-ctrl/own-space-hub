import type { Source } from "@prisma/client";

export type NormalizedProduct = {
  source: Source;
  externalId: string;
  title: string;
  description?: string;
  price: number;
  oldPrice?: number;
  currency: string;
  image?: string;
  gallery?: string[];
  rating?: number;
  reviewsCount?: number;
  sellerName?: string;
  sellerUrl?: string;
  platform?: string;
  publisher?: string;
  region?: string;
  genres?: string[];
  categoryName?: string;
  affiliateUrl: string;
  inStock?: boolean;
  hasImage?: boolean;
};

export interface ProductImporter {
  source: Source;
  fetchProducts(opts?: { page?: number; pageSize?: number }): Promise<NormalizedProduct[]>;
  fetchProduct(externalId: string): Promise<NormalizedProduct | null>;
}
