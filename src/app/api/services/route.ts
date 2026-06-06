import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { serviceSchema } from "@/lib/validators";
import { buildSearchKeywords } from "@/lib/marketplace";
import { loadPublicUserSummary } from "@/lib/marketplace-server";

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

async function buildServiceResponse(serviceId: string) {
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
    const providerId = url.searchParams.get("providerId");
    const limitParam = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "48"), 1), 100);

    let queryRef = adminDb
      .collection(COLLECTIONS.SERVICES)
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limitParam);

    if (providerId) {
      queryRef = adminDb
        .collection(COLLECTIONS.SERVICES)
        .where("providerId", "==", providerId)
        .where("isActive", "==", true)
        .orderBy("createdAt", "desc")
        .limit(limitParam);
    }

    const snapshot = await queryRef.get();
    const services = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() as any;
        const provider = await loadPublicUserSummary(data.providerId);

        return {
          id: docSnap.id,
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
      })
    );

    return NextResponse.json({ ok: true, services });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to load services" },
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

    const parsed = serviceSchema.parse({
      title: body.title,
      price: toNumber(body.price),
      category: body.category,
      locationType: body.locationType,
      location: body.location
    });

    const docRef = adminDb.collection(COLLECTIONS.SERVICES).doc();
    const now = new Date().toISOString();

    const service = {
      id: docRef.id,
      providerId: profile.uid,
      title: parsed.title,
      price: parsed.price,
      category: parsed.category,
      locationType: parsed.locationType,
      location: parsed.location,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      searchKeywords: buildSearchKeywords([
        parsed.title,
        parsed.category,
        parsed.location,
        parsed.locationType,
        profile.fullName,
        profile.email
      ])
    };

    await docRef.set(service);

    const response = await buildServiceResponse(docRef.id);

    return NextResponse.json({
      ok: true,
      service: response ?? service
    });
  } catch (error: any) {
    const message =
      error?.name === "ZodError"
        ? "Invalid service data"
        : error?.message ?? "Failed to create service";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
