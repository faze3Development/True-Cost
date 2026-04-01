const fs = require('fs');
const path = require('path');

// Fix settings.tsx
let settingsContent = fs.readFileSync('./frontend/app/pages/settings.tsx', 'utf8');
settingsContent = settingsContent.replace(
  '{ label: "Cost Calculator", href: "#" }',
  '{ label: "Cost Calculator", href: "/pages/truecost" }'
);
fs.writeFileSync('./frontend/app/pages/settings.tsx', settingsContent);

console.log('Navigation links fixed!');
