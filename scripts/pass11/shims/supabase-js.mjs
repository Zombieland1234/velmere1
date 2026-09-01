/**
 * PASS11 import-only shim. Tests that inject database dependencies may load modules
 * without installing the SDK. Any attempt to instantiate a real client fails closed.
 */
export function createClient() {
  throw new Error("pass11_offline_supabase_sdk_client_not_available");
}
