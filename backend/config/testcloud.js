const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({ 
  cloud_name: 'dtorpeosf', // Corrected spelling: r before p
  api_key: '548469229338858', 
  api_secret: 'Z8OszBAc0pE3g5hQ2nCZ9vLqdvk' // Corrected with Capital O
});

console.log("Attempting upload to cloud: dtorpeosf...");

const imagePath = path.resolve(__dirname, '../../Frontend/images/2nd.JPEG');

cloudinary.uploader.upload(imagePath, { 
    folder: 'my_uploads'
})
.then(result => {
    console.log("--- SUCCESS! ---");
    console.log("IMAGE URL:", result.secure_url);
})
.catch(err => {
    console.log("--- FAILED ---");
    console.log("Message:", err.message);
});