const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/app/[locale]/error.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldEffect = `  useEffect(() => {
    reportBrowserBoundaryFailure({
      event: "locale_view_recovery",
      error,
      digest: reference,
    });
  }, [error, reference]);`;

const newEffect = `  useEffect(() => {
    console.error("[DEV_LOCALE_ERROR_ACTUAL]:", error?.message, error?.stack);
    reportBrowserBoundaryFailure({
      event: "locale_view_recovery",
      error,
      digest: reference,
    });
  }, [error, reference]);`;

if (content.includes(oldEffect)) {
  content = content.replace(oldEffect, newEffect);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched error.tsx to log actual dev error to console!');
} else {
  console.log('oldEffect not matched');
}
