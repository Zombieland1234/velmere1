export type ReadinessItem = {
  id: string;
  label: string;
  present: boolean;
  group: string;
};

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function flag(name: string) {
  return process.env[name] === "true";
}

export function getStoreProductionReadiness(): ReadinessItem[] {
  return [
    { id: "seller_name", group: "seller", label: "STORE_SELLER_NAME", present: hasEnv("STORE_SELLER_NAME") },
    { id: "seller_email", group: "seller", label: "STORE_SELLER_EMAIL", present: hasEnv("STORE_SELLER_EMAIL") },
    { id: "seller_country", group: "seller", label: "STORE_SELLER_COUNTRY", present: hasEnv("STORE_SELLER_COUNTRY") },
    {
      id: "seller_address",
      group: "seller",
      label: "STORE_SELLER_ADDRESS",
      present: hasEnv("STORE_SELLER_ADDRESS") && flag("STORE_SELLER_ADDRESS_READY"),
    },
    { id: "site_url", group: "platform", label: "NEXT_PUBLIC_SITE_URL", present: hasEnv("NEXT_PUBLIC_SITE_URL") },
    { id: "commercial", group: "platform", label: "STORE_COMMERCIAL_READY", present: flag("STORE_COMMERCIAL_READY") },
    { id: "stripe_secret", group: "stripe", label: "STRIPE_SECRET_KEY", present: hasEnv("STRIPE_SECRET_KEY") },
    {
      id: "stripe_publishable",
      group: "stripe",
      label: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      present: hasEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    },
    { id: "stripe_webhook", group: "stripe", label: "STRIPE_WEBHOOK_SECRET", present: hasEnv("STRIPE_WEBHOOK_SECRET") },
    { id: "printful", group: "printful", label: "PRINTFUL_API_TOKEN", present: hasEnv("PRINTFUL_API_TOKEN") },
    { id: "printful_store", group: "printful", label: "PRINTFUL_STORE_ID", present: hasEnv("PRINTFUL_STORE_ID") },
    { id: "tapstitch", group: "tapstitch", label: "TAPSTITCH_IMPORT_MODE", present: hasEnv("TAPSTITCH_IMPORT_MODE") },
    { id: "shipping", group: "shipping", label: "STORE_SHIPPING_RATES_READY", present: flag("STORE_SHIPPING_RATES_READY") },
    { id: "tax", group: "shipping", label: "STORE_TAX_READY", present: flag("STORE_TAX_READY") },
    { id: "returns", group: "legal", label: "STORE_RETURNS_POLICY_FINAL", present: flag("STORE_RETURNS_POLICY_FINAL") },
    { id: "privacy", group: "legal", label: "STORE_PRIVACY_POLICY_FINAL", present: flag("STORE_PRIVACY_POLICY_FINAL") },
    { id: "auth", group: "auth", label: "AUTH_SECRET", present: hasEnv("AUTH_SECRET") },
    { id: "database", group: "auth", label: "DATABASE_URL", present: hasEnv("DATABASE_URL") },
    {
      id: "email",
      group: "auth",
      label: "EMAIL_SERVER / RESEND_API_KEY",
      present: hasEnv("EMAIL_SERVER") || hasEnv("RESEND_API_KEY"),
    },
    {
      id: "ai",
      group: "angel",
      label: "GEMINI_API_KEY / OPENAI_API_KEY",
      present: hasEnv("GEMINI_API_KEY") || hasEnv("OPENAI_API_KEY"),
    },
    { id: "vlm_chain", group: "vlm", label: "VLM_CHAIN_ID", present: hasEnv("VLM_CHAIN_ID") },
    { id: "vlm_contract", group: "vlm", label: "VLM_CONTRACT_ADDRESS", present: hasEnv("VLM_CONTRACT_ADDRESS") },
    { id: "vlm_treasury", group: "vlm", label: "VLM_TREASURY_ADDRESS", present: hasEnv("VLM_TREASURY_ADDRESS") },
    { id: "vlm_router", group: "vlm", label: "VLM_DEX_ROUTER", present: hasEnv("VLM_DEX_ROUTER") },
    { id: "vlm_pool", group: "vlm", label: "VLM_POOL_ADDRESS", present: hasEnv("VLM_POOL_ADDRESS") },
    { id: "vlm_audit", group: "vlm", label: "VLM_AUDIT_URL", present: hasEnv("VLM_AUDIT_URL") },
    { id: "vlm_ready", group: "vlm", label: "VLM_COMMERCIAL_READY", present: flag("VLM_COMMERCIAL_READY") },
  ];
}

export function getReadinessByGroup() {
  const items = getStoreProductionReadiness();
  const groups = new Map<string, ReadinessItem[]>();
  for (const item of items) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }
  return groups;
}
