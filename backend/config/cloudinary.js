const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: 'dtorpeosf'.trim(), 
  api_key: '548469229338858'.trim(), 
  api_secret: 'Z8OszBAc0pE3g5hQ2nCZ9vLqdvk'.trim() 
});

module.exports = cloudinary;
