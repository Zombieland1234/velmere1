# Velmère VLM Prompt + Square Hotfix

## Fixed
- VLM Basic/Pro access prompt is now rendered through a React portal into document.body. This avoids fixed-position bugs caused by animated page wrappers and keeps the modal centered on desktop and mobile.
- PageTransition no longer uses transform/filter wrappers, preventing fixed overlays from being trapped below the viewport.
- VLM mode switch is larger and moved further between Menu and the central Velmère logo.
- Square floating + action moved to the right middle screen edge and remains fixed while scrolling.
- Square login-required notifications now appear as a clear top system alert instead of a low hidden toast.
- Square Create Signal top button and floating + share the same error/action path.

## Honest status
- Google OAuth still requires real OAuth credentials/callback setup.
- Real VLM token gating requires final contract address, ABI, chain and backend verification.
- MetaMask/Phantom mobile connection still depends on official wallet browser/deeplink behavior.
