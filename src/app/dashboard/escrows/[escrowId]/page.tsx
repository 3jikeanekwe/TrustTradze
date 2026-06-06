import { redirect } from "next/navigation";

export default async function EscrowDetailRedirect({
  params
}: {
  params: Promise<{ escrowId: string }>;
}) {
  const { escrowId } = await params;
  redirect(`/e/${escrowId}`);
}
