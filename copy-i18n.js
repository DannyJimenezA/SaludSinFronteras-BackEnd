const fs = require('fs-extra');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'i18n');
const destDir = path.join(__dirname, 'dist', 'src', 'i18n');

async function copyI18n() {
  try {
    await fs.ensureDir(destDir);
    await fs.copy(srcDir, destDir);
    console.log('✅ i18n files copied successfully');
  } catch (err) {
    console.error('❌ Error copying i18n files:', err);
    process.exit(1);
  }
}

copyI18n();
