import { buildEscrowLink, formatMoney } from "@/lib/escrow";

type EmailPayload = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shell({
  heading,
  intro,
  lines,
  ctaLabel,
  ctaUrl,
  footer
}: {
  heading: string;
  intro: string;
  lines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}) {
  const safeHeading = escapeHtml(heading);
  const safeIntro = escapeHtml(intro);
  const safeLines = lines.map((line) => `<li style="margin-bottom:8px">${escapeHtml(line)}</li>`).join("");
  const safeFooter = footer ? `<p style="margin-top:20px;color:#64748b">${escapeHtml(footer)}</p>` : "";

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px">
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a">${safeHeading}</h1>
        <p style="margin:0 0 18px;color:#334155;line-height:1.7">${safeIntro}</p>
        <ul style="padding-left:20px;color:#0f172a;line-height:1.7">${safeLines}</ul>
        ${
          ctaLabel && ctaUrl
            ? `<p style="margin:24px 0 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:700">${escapeHtml(ctaLabel)}</a></p>`
            : ""
        }
        ${safeFooter}
      </div>
    </div>
  `;
}

function textShell({
  heading,
  intro,
  lines,
  ctaLabel,
  ctaUrl,
  footer
}: {
  heading: string;
  intro: string;
  lines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}) {
  const body = [
    heading,
    "",
    intro,
    "",
    ...lines.map((line) => `- ${line}`)
  ];

  if (ctaLabel && ctaUrl) {
    body.push("", `${ctaLabel}: ${ctaUrl}`);
  }

  if (footer) {
    body.push("", footer);
  }

  return body.join("\n");
}

function buildEmail(
  subject: string,
  heading: string,
  intro: string,
  lines: string[],
  ctaLabel?: string,
  ctaUrl?: string,
  footer?: string
): EmailPayload {
  return {
    subject,
    html: shell({ heading, intro, lines, ctaLabel, ctaUrl, footer }),
    text: textShell({ heading, intro, lines, ctaLabel, ctaUrl, footer })
  };
}

export function buildEscrowCreatedEmail(input: {
  appName: string;
  recipientName: string;
  role: "buyer" | "seller";
  title: string;
  amount: number;
  feeAmount: number;
  buyerPaysAmount: number;
  sellerReceivesAmount: number;
  buyerLink: string;
  sellerLink: string;
  counterpartyName: string;
  counterpartyEmail: string;
}) {
  const link = input.role === "buyer" ? input.buyerLink : input.sellerLink;
  const title = input.role === "buyer" ? "Escrow created for your purchase" : "Escrow created for your service/product";
  const intro =
    input.role === "buyer"
      ? `Hi ${input.recipientName}, an escrow deal has been created for "${input.title}". Open your link, review the deal, pay through the platform, and confirm receipt when the goods or service arrive.`
      : `Hi ${input.recipientName}, an escrow deal has been created for "${input.title}". Open your link to see the payment status, transaction details, and the buyer confirmation flow.`;
  return buildEmail(
    `${input.appName}: ${title}`,
    title,
    intro,
    [
      `Deal: ${input.title}`,
      `Escrow fee: ${formatMoney(input.feeAmount)}`,
      `Buyer pays: ${formatMoney(input.buyerPaysAmount)}`,
      `Seller receives: ${formatMoney(input.sellerReceivesAmount)}`,
      `Counterparty: ${input.counterpartyName} (${input.counterpartyEmail})`
    ],
    "Open deal",
    link,
    input.role === "buyer"
      ? "After payment, use the transaction page to confirm receipt or open a dispute."
      : "Use the transaction page to follow the buyer payment and deal status."
  );
}

export function buildEscrowFundedEmail(input: {
  appName: string;
  recipientName: string;
  role: "buyer" | "seller";
  title: string;
  amount: number;
  buyerLink: string;
  sellerLink: string;
}) {
  const link = input.role === "buyer" ? input.buyerLink : input.sellerLink;
  const title = "Escrow funded";
  const intro =
    input.role === "buyer"
      ? `Hi ${input.recipientName}, the escrow payment for "${input.title}" has been received. Open the deal page to confirm receipt once the product or service is delivered.`
      : `Hi ${input.recipientName}, the buyer has funded the escrow for "${input.title}". You can now prepare the product or complete the service.`;
  return buildEmail(
    `${input.appName}: ${title}`,
    title,
    intro,
    [`Deal: ${input.title}`, `Amount: ${formatMoney(input.amount)}`],
    "Open deal",
    link,
    "Remember to confirm receipt so the funds can be released."
  );
}

export function buildEscrowCompletedEmail(input: {
  appName: string;
  recipientName: string;
  role: "buyer" | "seller";
  title: string;
  amount: number;
  buyerLink: string;
  sellerLink: string;
}) {
  const link = input.role === "buyer" ? input.buyerLink : input.sellerLink;
  return buildEmail(
    `${input.appName}: Escrow completed`,
    "Escrow completed",
    `Hi ${input.recipientName}, the escrow for "${input.title}" has been completed successfully.`,
    [`Deal: ${input.title}`, `Amount: ${formatMoney(input.amount)}`],
    "Open deal",
    link,
    "You can view the transaction details anytime from your dashboard."
  );
}

export function buildEscrowRefundedEmail(input: {
  appName: string;
  recipientName: string;
  role: "buyer" | "seller";
  title: string;
  amount: number;
  buyerLink: string;
  sellerLink: string;
  reason?: string | null;
}) {
  const link = input.role === "buyer" ? input.buyerLink : input.sellerLink;
  return buildEmail(
    `${input.appName}: Escrow refunded`,
    "Escrow refunded",
    `Hi ${input.recipientName}, the escrow for "${input.title}" has been refunded.`,
    [
      `Deal: ${input.title}`,
      `Amount: ${formatMoney(input.amount)}`,
      ...(input.reason ? [`Reason: ${input.reason}`] : [])
    ],
    "Open deal",
    link,
    "You can check the transaction record from your dashboard."
  );
}

export function buildEscrowDisputedEmail(input: {
  appName: string;
  recipientName: string;
  role: "buyer" | "seller";
  title: string;
  amount: number;
  buyerLink: string;
  sellerLink: string;
  reason: string;
}) {
  const link = input.role === "buyer" ? input.buyerLink : input.sellerLink;
  return buildEmail(
    `${input.appName}: Escrow disputed`,
    "Escrow disputed",
    `Hi ${input.recipientName}, a dispute was opened for "${input.title}".`,
    [
      `Deal: ${input.title}`,
      `Amount: ${formatMoney(input.amount)}`,
      `Reason: ${input.reason}`
    ],
    "Open deal",
    link,
    "Keep all discussion inside the transaction page so the record stays complete."
  );
}

export function buildEscrowReleaseEmail(input: {
  appName: string;
  recipientName: string;
  role: "buyer" | "seller";
  title: string;
  amount: number;
  buyerLink: string;
  sellerLink: string;
}) {
  const link = input.role === "buyer" ? input.buyerLink : input.sellerLink;
  return buildEmail(
    `${input.appName}: Escrow released`,
    "Escrow released",
    `Hi ${input.recipientName}, the escrow for "${input.title}" has been released.`,
    [`Deal: ${input.title}`, `Amount released: ${formatMoney(input.amount)}`],
    "Open deal",
    link,
    "You can view the full transaction record from your dashboard."
  );
}

export function buyerDealLink(token: string) {
  return buildEscrowLink(token);
}

export function sellerDealLink(token: string) {
  return buildEscrowLink(token);
}
