import assert from "node:assert/strict";
import type { VelmereResolvedAccount } from "../../lib/auth/account-session.js";
import {
  listAuditAccountMessages,
  type ListAuditAccountMessagesDependencies,
} from "../../lib/account/audit-account-messages.js";
import {
  handleAccountAuditMessagesGet,
  type AccountAuditMessagesGetDependencies,
} from "../../lib/server/lazy-route-modules/account--audit-messages.js";

type QueryCounters = {
  providerReads: number;
  writeEffects: number;
  filters: Array<[string, unknown]>;
};

type SupabaseRow = Record<string, unknown>;

function row(args: {
  id: string;
  accountId: string;
  contactEmail: string;
}): SupabaseRow {
  const now = "2026-07-29T12:00:00.000Z";
  return {
    id: args.id,
    message_id: args.id,
    request_id: `request-${args.id}`,
    account_id: args.accountId,
    contact_email: args.contactEmail,
    locale: "en",
    message_status: "queued",
    delivery_status: "queued",
    operator_status: "intake",
    created_at: now,
    updated_at: now,
    message: {
      id: args.id,
      title: `Message ${args.id}`,
      body: "Customer-safe body",
      status: "queued",
      packageLabel: "Velmère Audit",
      requestId: `request-${args.id}`,
      createdAt: now,
      eta: "within 24h",
      accountRoute: "/en/account?tab=messages",
      nextSteps: [],
    },
  };
}

function serviceRoleDependency(args: {
  rows: SupabaseRow[];
  counters: QueryCounters;
  ignoreFilters?: boolean;
}): ListAuditAccountMessagesDependencies {
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      args.counters.filters.push([column, value]);
      return query;
    },
    order: () => query,
    limit: () => query,
    insert: () => {
      args.counters.writeEffects += 1;
      throw new Error("unexpected_insert");
    },
    update: () => {
      args.counters.writeEffects += 1;
      throw new Error("unexpected_update");
    },
    upsert: () => {
      args.counters.writeEffects += 1;
      throw new Error("unexpected_upsert");
    },
    delete: () => {
      args.counters.writeEffects += 1;
      throw new Error("unexpected_delete");
    },
    then: (
      resolve: (result: { data: SupabaseRow[]; error: null }) => unknown,
      reject?: (error: unknown) => unknown,
    ) => {
      const filtered = args.ignoreFilters
        ? args.rows
        : args.rows.filter((candidate) => (
            args.counters.filters.every(([column, expected]) => (
              candidate[column] === expected
            ))
          ));
      return Promise.resolve({ data: filtered, error: null }).then(
        resolve,
        reject,
      );
    },
  };
  const client = {
    from: (table: string) => {
      args.counters.providerReads += 1;
      assert.equal(table, "velmere_audit_account_messages");
      return query;
    },
  };
  return {
    getSupabaseServiceRoleClient: () => client as never,
  };
}

const owner: VelmereResolvedAccount = {
  accountId: "supabase:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  displayName: "Tenant A",
  handle: "@tenant-a",
  email: "shared@example.test",
  provider: "server",
  sessionSource: "server",
};
const otherAccountId =
  "supabase:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function request(query = "") {
  return new Request(
    `https://velmere.example/api/account/audit-messages${query}`,
    { method: "GET" },
  );
}

function routeDependencies(
  storage: ListAuditAccountMessagesDependencies,
  counters: { listCalls: number },
): AccountAuditMessagesGetDependencies {
  return {
    resolveRequestAccount: async () => owner,
    listAuditAccountMessages: async (input) => {
      counters.listCalls += 1;
      return listAuditAccountMessages(input, storage);
    },
    attachPass2377DeliveryReceiptSummaries: async (messages) =>
      messages,
  } as AccountAuditMessagesGetDependencies;
}

async function main() {
  const rows = [
    row({
      id: "message-owner",
      accountId: owner.accountId,
      contactEmail: owner.email ?? "",
    }),
    row({
      id: "message-cross-tenant-same-email",
      accountId: otherAccountId,
      contactEmail: owner.email ?? "",
    }),
  ];

  const positiveCounters: QueryCounters = {
    providerReads: 0,
    writeEffects: 0,
    filters: [],
  };
  const positiveRouteCounters = { listCalls: 0 };
  const positive = await handleAccountAuditMessagesGet(
    request(
      `?accountId=${encodeURIComponent(owner.accountId)}`
      + `&email=${encodeURIComponent(owner.email ?? "")}`
      + "&locale=en&limit=24",
    ),
    routeDependencies(
      serviceRoleDependency({
        rows,
        counters: positiveCounters,
      }),
      positiveRouteCounters,
    ),
  );
  assert.equal(positive.status, 200);
  const positivePayload = await positive.json() as {
    schemaVersion?: string;
    messages?: Array<Record<string, unknown> & { id?: string }>;
    count?: number;
  };
  assert.equal(positivePayload.count, 1);
  assert.deepEqual(
    positivePayload.messages?.map((message) => message.id),
    ["message-owner"],
  );
  assert.equal(
    positivePayload.schemaVersion,
    "velmere.public-audit-account-messages.v2",
  );
  const positiveRecord = positivePayload as Record<string, unknown>;
  assert.equal(positiveRecord.deliveryMode, "durable");
  for (const forbidden of ["source", "passId", "pass2363", "pass2369", "pass2377"]) {
    assert.equal(forbidden in positiveRecord, false, `public response must not expose ${forbidden}`);
  }
  assert.ok(
    positivePayload.messages?.every(
      (message) => !("accountId" in message) && !("contactEmail" in message),
    ),
    "public projection must not expose tenant binding fields",
  );
  assert.deepEqual(positiveCounters.filters, [
    ["locale", "en"],
    ["account_id", owner.accountId],
    ["contact_email", owner.email],
  ]);
  assert.equal(positiveCounters.providerReads, 1);
  assert.equal(positiveCounters.writeEffects, 0);
  assert.equal(positiveRouteCounters.listCalls, 1);

  const adversarialCounters: QueryCounters = {
    providerReads: 0,
    writeEffects: 0,
    filters: [],
  };
  const adversarialRouteCounters = { listCalls: 0 };
  const adversarial = await handleAccountAuditMessagesGet(
    request("?locale=en"),
    routeDependencies(
      serviceRoleDependency({
        rows,
        counters: adversarialCounters,
        ignoreFilters: true,
      }),
      adversarialRouteCounters,
    ),
  );
  assert.equal(adversarial.status, 503);
  const adversarialText = await adversarial.text();
  assert.equal(
    adversarialText.includes("message-cross-tenant-same-email"),
    false,
  );
  assert.equal(adversarialCounters.providerReads, 1);
  assert.equal(adversarialCounters.writeEffects, 0);
  assert.equal(adversarialRouteCounters.listCalls, 1);

  const mismatchCounters: QueryCounters = {
    providerReads: 0,
    writeEffects: 0,
    filters: [],
  };
  const mismatchRouteCounters = { listCalls: 0 };
  const mismatch = await handleAccountAuditMessagesGet(
    request(`?accountId=${encodeURIComponent(otherAccountId)}`),
    routeDependencies(
      serviceRoleDependency({
        rows,
        counters: mismatchCounters,
      }),
      mismatchRouteCounters,
    ),
  );
  assert.equal(mismatch.status, 403);
  assert.equal(mismatchCounters.providerReads, 0);
  assert.equal(mismatchCounters.writeEffects, 0);
  assert.equal(mismatchRouteCounters.listCalls, 0);

  const missingAccountCounters: QueryCounters = {
    providerReads: 0,
    writeEffects: 0,
    filters: [],
  };
  await assert.rejects(
    listAuditAccountMessages(
      { contactEmail: owner.email, locale: "en" },
      serviceRoleDependency({
        rows,
        counters: missingAccountCounters,
      }),
    ),
    /account_id_required_for_email_scope/u,
  );
  assert.equal(missingAccountCounters.providerReads, 0);
  assert.equal(missingAccountCounters.writeEffects, 0);

  console.log(
    "Audit account-message tenant isolation: PASS "
    + "(1 handler positive + 3 fail-closed negatives; 0 cross-tenant returns/writes)",
  );
}

await main();
