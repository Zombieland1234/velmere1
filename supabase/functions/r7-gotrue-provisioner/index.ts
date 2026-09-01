import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => new Response(JSON.stringify({
  ok: false,
  error: "provisioner_disabled_after_owner_authorized_staging_setup",
  schemaVersion: "velmere.r7.gotrue-provisioner-disabled.v1",
  customerFinalCredit: false,
}), {
  status: 410,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
}));
