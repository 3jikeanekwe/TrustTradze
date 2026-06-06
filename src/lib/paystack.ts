import crypto from "node:crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function requireSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("Missing PAYSTACK_SECRET_KEY");
  }
  return key;
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  const data = (await res.json()) as T & { status?: boolean; message?: string };

  if (!res.ok) {
    throw new Error(
      `Paystack request failed (${res.status}): ${
        typeof data === "object" && data && "message" in data ? data.message : "Unknown error"
      }`
    );
  }

  return data;
}

export type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    paid_at: string;
    created_at: string;
    fees: number;
    customer: {
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
};

export type PaystackTransferRecipientResponse = {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    currency: string;
    domain: string;
    id: number;
    name: string;
    recipient_code: string;
    type: string;
    is_deleted: boolean;
    details: {
      account_number: string;
      account_name: string;
      bank_code: string;
      bank_name: string;
    };
  };
};

export type PaystackTransferResponse = {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    status: string;
    transfer_code: string;
  };
};

export type PaystackRefundResponse = {
  status: boolean;
  message: string;
  data: {
    transaction: number;
    amount: number;
    reference: string;
    status: string;
  };
};

export async function initializePaystackTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  return paystackRequest<PaystackInitializeResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata
    })
  });
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<PaystackVerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export async function createPaystackTransferRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
}) {
  return paystackRequest<PaystackTransferRecipientResponse>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: input.currency ?? "NGN"
    })
  });
}

export async function createPaystackTransfer(input: {
  recipient: string;
  amountKobo: number;
  reason: string;
  reference: string;
}) {
  return paystackRequest<PaystackTransferResponse>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      recipient: input.recipient,
      amount: input.amountKobo,
      reason: input.reason,
      reference: input.reference
    })
  });
}

export async function refundPaystackTransaction(input: {
  transaction: string;
  amountKobo?: number;
  customerNote?: string;
  merchantNote?: string;
}) {
  return paystackRequest<PaystackRefundResponse>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: input.transaction,
      ...(typeof input.amountKobo === "number" ? { amount: input.amountKobo } : {}),
      ...(input.customerNote ? { customer_note: input.customerNote } : {}),
      ...(input.merchantNote ? { merchant_note: input.merchantNote } : {})
    })
  });
}

export function verifyPaystackWebhookSignature(payload: string, signature: string | null | undefined) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) {
    return false;
  }

  const hash = crypto.createHmac("sha512", secret).update(payload).digest("hex");
  return hash === signature;
}
