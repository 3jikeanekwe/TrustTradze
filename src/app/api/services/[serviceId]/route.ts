import { NextRequest, NextResponse } from "next/server";
import { getServerSessionProfile } from "@/lib/firebase/session";
import { loadServiceView } from "@/lib/marketplace-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const profile = await getServerSessionProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.isDisabled) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const { serviceId } = await params;
    const service = await loadServiceView(serviceId);

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, service });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to load service" },
      { status: 400 }
    );
  }
}
