// Generates the QR image used both as the Viro tracking target and as the
// on-screen marker. The encoded content is irrelevant (we never decode it) — a
// QR just makes a high-contrast, feature-rich, asymmetric tracking pattern.
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const out = path.join(__dirname, '..', 'assets', 'markers', 'qr.png');
fs.mkdirSync(path.dirname(out), { recursive: true });

QRCode.toFile(
  out,
  'spati-siteanchor:marker:1',
  { width: 1024, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#FFFFFF' } },
  (err) => {
    if (err) throw err;
    console.log('Wrote', out);
  },
);
