const cloudinary = require('./cloudinary');
const path = require('path');
const fs = require('fs');

async function uploadEverything() {
    // This points to your Frontend/images folder
    const directoryPath = path.join(__dirname, '../../Frontend/images');

    try {
        // Reads all file names in that folder
        const files = fs.readdirSync(directoryPath);
        
        console.log(`Found ${files.length} files. starting upload...`);

        for (const file of files) {
            // Only upload image files (jpg, png, jpeg, etc.)
            if (file.match(/\.(jpg|jpeg|png|gif|JPEG)$/i)) {
                const filePath = path.join(directoryPath, file);
                
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: 'my_website_images',
                    use_filename: true, // Keeps your file name (like 'italy.JPEG') in Cloudinary
                    unique_filename: false
                });

                console.log(`✅ ${file} uploaded! URL: ${result.secure_url}`);
            }
        }
        console.log("\n--- ALL DONE! COPY THE LINKS ABOVE ---");
    } catch (err) {
        console.error("Error during bulk upload:", err.message);
    }
}

uploadEverything();