const express = require('express');
const router = express.Router();
const { register, login, getMe, updateDetails, updatePassword, updateAvatar } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (_) {}
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const base = `user_${(req.user && req.user.id) || 'anon'}_${Date.now()}`;
    cb(null, base + ext.toLowerCase());
  }
});
const fileFilter = (req, file, cb) => {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(String(file.mimetype).toLowerCase());
  cb(null, ok);
};
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter });

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.put('/updateavatar', protect, upload.single('avatar'), updateAvatar);

module.exports = router;
