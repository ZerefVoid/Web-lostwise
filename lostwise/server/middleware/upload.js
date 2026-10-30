const multer = require('multer');
const { UPLOAD_DIR } = require('../config');

// Accepts images only, 5 MB maximum
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 5e6 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

// Public URL of the newly uploaded file (null if there is no file)
const urlPhoto = (file) => (file ? '/uploads/' + file.filename : null);

module.exports = { upload, urlPhoto };
