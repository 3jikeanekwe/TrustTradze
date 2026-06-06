import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/collections";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { buildSearchKeywords } from "@/lib/marketplace";
import {
  loadPublicUserSummary,
  loadProductView,
  loadServiceView
} from "@/lib/marketplace-server";

function toItems<T>(docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]) {
  return docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as T)
  }));
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
    const q = (url.searchParams.get("q") ?? "").trim();
    const tokens = buildSearchKeywords([q]).slice(0, 10);

    if (!q) {
      const [productSnap, serviceSnap, userSnap] = await Promise.all([
        adminDb
          .collection(COLLECTIONS.PRODUCTS)
          .where("isActive", "==", true)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get(),
        adminDb
          .collection(COLLECTIONS.SERVICES)
          .where("isActive", "==", true)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get(),
        adminDb
          .collection(COLLECTIONS.USERS)
          .where("isDisabled", "==", false)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get()
      ]);

      const products = await Promise.all(productSnap.docs.map((docSnap) => loadProductView(docSnap.id)));
      const services = await Promise.all(serviceSnap.docs.map((docSnap) => loadServiceView(docSnap.id)));
      const users = await Promise.all(
        userSnap.docs.map((docSnap) => loadPublicUserSummary(docSnap.id))
      );

      return NextResponse.json({
        ok: true,
        q,
        products: products.filter(Boolean),
        services: services.filter(Boolean),
        users: users.filter(Boolean)
      });
    }

    const [productSnap, serviceSnap, userSnap] = await Promise.all([
      adminDb
        .collection(COLLECTIONS.PRODUCTS)
        .where("isActive", "==", true)
        .where("searchKeywords", "array-contains-any", tokens)
        .limit(10)
        .get(),
      adminDb
        .collection(COLLECTIONS.SERVICES)
        .where("isActive", "==", true)
        .where("searchKeywords", "array-contains-any", tokens)
        .limit(10)
        .get(),
      adminDb
        .collection(COLLECTIONS.USERS)
        .where("isDisabled", "==", false)
        .where("searchKeywords", "array-contains-any", tokens)
        .limit(10)
        .get()
    ]);

    const products = await Promise.all(productSnap.docs.map((docSnap) => loadProductView(docSnap.id)));
    const services = await Promise.all(serviceSnap.docs.map((docSnap) => loadServiceView(docSnap.id)));
    const users = await Promise.all(
      userSnap.docs.map((docSnap) => loadPublicUserSummary(docSnap.id))
    );

    const sortByNewest = <T extends { createdAt?: string }>(items: Array<T | null>) =>
      items
        .filter(Boolean)
        .sort((a, b) => {
          const aTime = new Date(a!.createdAt ?? "").getTime();
          const bTime = new Date(b!.createdAt ?? "").getTime();
          return bTime - aTime;
        });

    return NextResponse.json({
      ok: true,
      q,
      products: sortByNewest(products),
      services: sortByNewest(services),
      users: sortByNewest(users)
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Search failed" },
      { status: 400 }
    );
  }
      }
