/*
  Upload a local file to Cloudinary and print the resulting URL.

  Usage (from repo root):
    node backend/tools/upload_to_cloudinary.js Frontend/images/m.JPEG

  Optional:
    node backend/tools/upload_to_cloudinary.js Frontend/images/m.JPEG my_website_images/location_bg

  Notes:
  - Uses existing backend Cloudinary config in backend/config/cloudinary.js
  - Prints both secure_url + public_id
*/

const path = require('path');
const fs = require('fs');

const cloudinary = require('../config/cloudinary');

async function main() {
  const [, , fileArg, publicIdArg] = process.argv;

  if (!fileArg) {
    console.error('Missing file path. Example: node backend/tools/upload_to_cloudinary.js Frontend/images/m.JPEG');
    process.exit(2);
  }

  const absPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(3);
  }

  const uploadOptions = {
    resource_type: 'image',
    folder: 'my_website_images'
  };

  if (publicIdArg) {
    // If you pass something like: my_website_images/location_bg
    // Cloudinary will derive folder/public_id from it.
    uploadOptions.public_id = publicIdArg;
    uploadOptions.overwrite = true;
  }

  const result = await cloudinary.uploader.upload(absPath, uploadOptions);

  console.log('secure_url:', result.secure_url);
  console.log('public_id:', result.public_id);
}

main().catch((err) => {
  console.error('Upload failed:', err?.message || err);
  process.exit(1);
});
