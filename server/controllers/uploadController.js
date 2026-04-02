const fs = require('fs');
const path = require('path');

const ensureUploadsDir = () => {
  const dir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const uploadImage = async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Invalid image data' });
    }
    const [meta, base64] = dataUrl.split(',');
    const extRaw = (meta.match(/data:image\/(.+);base64/) || [])[1] || 'png';
    const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
    const buffer = Buffer.from(base64, 'base64');
    const dir = ensureUploadsDir();
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${filename}`;
    res.json({ url: publicUrl });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Upload failed' });
  }
};

module.exports = { uploadImage };
