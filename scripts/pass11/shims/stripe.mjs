/** PASS11 import-only Stripe shim for dependency-injected offline unit tests. */
export default class Stripe {
  constructor() {
    throw new Error("pass11_offline_stripe_sdk_client_not_available");
  }
}
