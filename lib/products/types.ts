export type ProductProvider =
  | "manual"
  | "printful"
  | "tapstitch"
  | "external";

export type ProductStatus =
  | "draft"
  | "coming_soon"
  | "active"
  | "sold_out"
  | "archived"
  | "vlm_locked";

export type FulfilmentMode =
  | "disabled"
  | "external_link"
  | "manual"
  | "automatic";

export type LocalizedString = {
  pl: string;
  en: string;
  de: string;
};

export type SupportedCurrency = "EUR";

export type ProductVariant = {
  id: string;
  title: string;
  size?: string;
  color?: string;
  sku?: string;
  providerVariantId?: string;
  price?: {
    amount: number;
    currency: SupportedCurrency;
  };
  available?: boolean;
};

export type ProductImage = {
  url: string;
  alt: LocalizedString;
  width?: number;
  height?: number;
};

export type ProductSizeMeasurement = {
  size: string;
  chest?: string;
  length?: string;
  shoulders?: string;
  waist?: string;
  inseam?: string;
};

export type ProductTruthProfile = {
  material: LocalizedString;
  composition: LocalizedString;
  weight?: string;
  fit: LocalizedString;
  care: LocalizedString[];
  sizeGuide: {
    note: LocalizedString;
    measurements: ProductSizeMeasurement[];
  };
  deliveryNote: LocalizedString;
  returnNote: LocalizedString;
  launchNote?: LocalizedString;
};

export type Product = {
  id: string;
  slug: string;
  provider: ProductProvider;
  providerProductId?: string;
  providerVariantIds?: Record<string, string>;
  externalUrl?: string;

  status: ProductStatus;
  fulfilmentMode: FulfilmentMode;

  title: LocalizedString;
  description: LocalizedString;
  shortDescription: LocalizedString;
  truth?: ProductTruthProfile;

  price: {
    amount: number;
    currency: SupportedCurrency;
  };

  images: ProductImage[];
  variants: ProductVariant[];

  tags: string[];
  collection?: string;
  isVlmLocked?: boolean;

  importSource?: {
    type: "url" | "printful" | "csv";
    sourceUrl?: string;
    importedAt: string;
    warnings?: string[];
  };
};

export type ProductImportDraft = {
  draftId: string;
  product: Product;
  warnings: string[];
  validationErrors: string[];
};
