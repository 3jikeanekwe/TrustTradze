import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { buildWhatsAppUrl, getYouTubeEmbedUrl } from "@/lib/marketplace";

export type PublicUserSummary = {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  state: string | null;
  city: string | null;
  role: string;
  isDisabled: boolean;
  createdAt: string;
};

export type MarketplaceSellerView = PublicUserSummary & {
  whatsappUrl: string | null;
};

export type MarketplaceProductView = {
  id: string;
  sellerId: string;
  title: string;
  price: number;
  category: string;
  youtubeUrl: string;
  youtubeEmbedUrl: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  searchKeywords?: string[];
  seller: MarketplaceSellerView | null;
};

export type MarketplaceServiceView = {
  id: string;
  providerId: string;
  title: string;
  price: number;
  category: string;
  locationType: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  searchKeywords?: string[];
  provider: MarketplaceSellerView | null;
};

export async function loadPublicUserSummary(uid: string): Promise<MarketplaceSellerView | null> {
  const snap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();

  if (!snap.exists) return null;

  const data = snap.data() as any;

  const phoneNumber = typeof data.phoneNumber === "string" ? data.phoneNumber : null;

  return {
    uid: snap.id,
    fullName: data.fullName ?? "",
    email: data.email ?? "",
    phoneNumber,
    state: data.state ?? null,
    city: data.city ?? null,
    role: data.role ?? "user",
    isDisabled: Boolean(data.isDisabled),
    createdAt: data.createdAt ?? new Date().toISOString(),
    whatsappUrl: buildWhatsAppUrl(phoneNumber)
  };
}

export async function loadProductView(productId: string): Promise<MarketplaceProductView | null> {
  const snap = await adminDb.collection(COLLECTIONS.PRODUCTS).doc(productId).get();

  if (!snap.exists) return null;

  const data = snap.data() as any;
  const seller = await loadPublicUserSummary(data.sellerId);

  return {
    id: snap.id,
    sellerId: data.sellerId,
    title: data.title ?? "",
    price: Number(data.price ?? 0),
    category: data.category ?? "Other",
    youtubeUrl: data.youtubeUrl ?? "",
    youtubeEmbedUrl: getYouTubeEmbedUrl(data.youtubeUrl ?? ""),
    location: data.location ?? "",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    isActive: Boolean(data.isActive),
    searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
    seller
  };
}

export async function loadServiceView(serviceId: string): Promise<MarketplaceServiceView | null> {
  const snap = await adminDb.collection(COLLECTIONS.SERVICES).doc(serviceId).get();

  if (!snap.exists) return null;

  const data = snap.data() as any;
  const provider = await loadPublicUserSummary(data.providerId);

  return {
    id: snap.id,
    providerId: data.providerId,
    title: data.title ?? "",
    price: Number(data.price ?? 0),
    category: data.category ?? "Other",
    locationType: data.locationType ?? "Online",
    location: data.location ?? "",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    isActive: Boolean(data.isActive),
    searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
    provider
  };
      }
