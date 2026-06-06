import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { productSchema } from "@/lib/validators";
import { buildSearchKeywords, getYouTubeEmbedUrl } from "@/lib/marketplace";
import { loadPublicUserSummary } from "@/lib/marketplace-server";

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

async function buildProductResponse(productId: string) {
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

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerSessionProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.isDisabled) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const url = new URL(request.url);
    const sellerId = url.searchParams.get("sellerId");
    const limitParam = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "48"), 1), 100);

    let queryRef = adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limitParam);

    if (sellerId) {
      queryRef = adminDb
        .collection(COLLECTIONS.PRODUCTS)
        .where("sellerId", "==", sellerId)
        .where("isActive", "==", true)
        .orderBy("createdAt", "desc")
        .limit(limitParam);
    }

    const snapshot = await queryRef.get();
    const products = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() as any;
        const seller = await loadPublicUserSummary(data.sellerId);

        return {
          id: docSnap.id,
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
      })
    );

    return NextResponse.json({ ok: true, products });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to load products" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerSessionProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.isDisabled) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const body = await request.json();

    const parsed = productSchema.parse({
      title: body.title,
      price: toNumber(body.price),
      category: body.category,
      youtubeUrl: body.youtubeUrl,
      location: body.location
    });

    const docRef = adminDb.collection(COLLECTIONS.PRODUCTS).doc();
    const now = new Date().toISOString();

    const product = {
      id: docRef.id,
      sellerId: profile.uid,
      title: parsed.title,
      price: parsed.price,
      category: parsed.category,
      youtubeUrl: parsed.youtubeUrl,
      location: parsed.location,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      searchKeywords: buildSearchKeywords([
        parsed.title,
        parsed.category,
        parsed.location,
        profile.fullName,
        profile.email
      ])
    };

    await docRef.set(product);

    const response = await buildProductResponse(docRef.id);

    return NextResponse.json({
      ok: true,
      product: response ?? product
    });
  } catch (error: any) {
    const message =
      error?.name === "ZodError"
        ? "Invalid product data"
        : error?.message ?? "Failed to create product";

    return NextResponse.json({ error: message }, { status: 400 });
  }
        }
