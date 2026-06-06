import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { loadPublicUserSummary, loadProductView, loadServiceView } from "@/lib/marketplace-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const profile = await getServerSessionProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.isDisabled) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const { uid } = await params;
    const user = await loadPublicUserSummary(uid);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [productSnap, serviceSnap] = await Promise.all([
      adminDb
        .collection(COLLECTIONS.PRODUCTS)
        .where("sellerId", "==", uid)
        .where("isActive", "==", true)
        .orderBy("createdAt", "desc")
        .limit(12)
        .get(),
      adminDb
        .collection(COLLECTIONS.SERVICES)
        .where("providerId", "==", uid)
        .where("isActive", "==", true)
        .orderBy("createdAt", "desc")
        .limit(12)
        .get()
    ]);

    const products = await Promise.all(productSnap.docs.map((docSnap) => loadProductView(docSnap.id)));
    const services = await Promise.all(serviceSnap.docs.map((docSnap) => loadServiceView(docSnap.id)));

    return NextResponse.json({
      ok: true,
      user,
      products: products.filter(Boolean),
      services: services.filter(Boolean)
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to load user profile" },
      { status: 400 }
    );
  }
}
