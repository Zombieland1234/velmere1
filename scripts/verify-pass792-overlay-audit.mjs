import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const pass = [];
const fail = [];
function expect(condition, label) {
  (condition ? pass : fail).push(label);
}

const provider = read('lib/ai/vlm-provider-registry.ts');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const navbar = read('components/Navbar.tsx');
const buyAccess = read('components/vlm/VlmBuyAccessPanel.tsx');
const modeChoice = read('components/vlm/VlmModeChoicePrompt.tsx');
const selectedSystems = read('components/vlm/VlmSelectedSystems.tsx');
const modeSwitch = read('components/vlm/VlmModeSwitch.tsx');
const commandPalette = read('components/ui/CommandPalette.tsx');
const productDetail = read('components/shop/ProductDetailClient.tsx');
const mail = read('components/contact/FloatingMailWidget.tsx');
const cart = read('components/CartDrawer.tsx');
const primitives = read('components/ui/OverlayPrimitives.tsx');

expect(!provider.includes('@google/genai'), 'Gemini provider has no @google/genai build import/string');
expect(!pkg.dependencies?.['@google/genai'], 'package.json does not require @google/genai');
expect(!lock.packages?.['node_modules/@google/genai'], 'package-lock does not lock @google/genai');
expect(navbar.includes('DropdownRoot') && navbar.includes('surface: "language-selector"'), 'Navbar language selector uses DropdownRoot');
expect(navbar.includes('surface: "header-wallet-panel"') && navbar.includes('surface: "member-menu"'), 'Navbar wallet drawer/member menu use shared overlay primitives');
expect(!navbar.includes('document.addEventListener("pointerdown"'), 'Navbar removed global pointerdown dropdown closer');
expect(buyAccess.includes('DrawerRoot') && !buyAccess.includes('createPortal'), 'VLM access panel uses DrawerRoot without manual portal');
expect(modeChoice.includes('ModalRoot') && !modeChoice.includes('createPortal'), 'VLM mode choice uses ModalRoot without manual portal');
expect(selectedSystems.includes('ModalRoot') && !selectedSystems.includes('createPortal'), 'VLM selected systems uses ModalRoot without manual portal');
expect(modeSwitch.includes('ModalRoot') && !modeSwitch.includes('role="dialog"'), 'VLM mode chart uses ModalRoot instead of local dialog');
expect(commandPalette.includes('ModalRoot') && commandPalette.includes('data-modal-scroll-region="true"'), 'Command palette uses ModalRoot and explicit scroll region');
expect(productDetail.includes('ModalRoot') && productDetail.includes('surface: "product-size-guide"'), 'Product size guide uses ModalRoot');
expect(mail.includes('DrawerRoot') && mail.includes('data-modal-scroll-region="true"'), 'Floating mail widget uses DrawerRoot and scroll region');
expect(cart.includes('surface: "cart-bottom-sheet"') && cart.includes('motionPreset="bottom"') && cart.includes('rounded-t-[2rem]'), 'Cart opens as bottom-right sheet instead of left drawer');
expect(mail.includes('top-3') && mail.includes('sm:max-h-'), 'Mail drawer has explicit viewport height bounds');
expect(primitives.includes('OverlayContentBoundary'), 'Overlay primitives keep safe render fallback');
expect(primitives.includes('useModalScrollLock(open)') && primitives.includes('useDialogFocusBoundary(open'), 'Modal/Drawer primitives own scroll lock and focus boundary');

if (fail.length) {
  console.error('PASS792 overlay audit failed');
  for (const item of fail) console.error(' - ' + item);
  process.exit(1);
}
console.log(`PASS792 overlay audit passed: ${pass.length}/${pass.length}`);
for (const item of pass) console.log(' + ' + item);
