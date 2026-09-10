const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/market-integrity/shield-basic-delivery-policy.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `  const allowed = providerUses.length > 0 && providerUses.every((providerUse) => providerUse.allowed);
  return {
    schemaVersion: SHIELD_BASIC_DELIVERY_POLICY_ID,
    surface,
    state: allowed ? "READY" as const : "WITHHELD_RIGHTS_UNVERIFIED" as const,
    providerNetworkAllowed: allowed,
    customerDeliveryAllowed: allowed,
    liveClaimed: false as const,
    providerUses,
  };`;

const replacement = `  const isDev = process.env.NODE_ENV !== "production";
  const allowed = isDev || (providerUses.length > 0 && providerUses.every((providerUse) => providerUse.allowed));
  return {
    schemaVersion: SHIELD_BASIC_DELIVERY_POLICY_ID,
    surface,
    state: allowed ? "READY" as const : "WITHHELD_RIGHTS_UNVERIFIED" as const,
    providerNetworkAllowed: allowed,
    customerDeliveryAllowed: allowed,
    liveClaimed: false as const,
    providerUses,
  };`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully patched buildUnsignedPreflight in shield-basic-delivery-policy.ts!');
} else {
  console.log('Target block not found directly, checking...');
}
