const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer'); // 追加
const path = require('path');     // 追加
const app = express();
app.use(express.json());
app.use(cors());

// ファイル保存先の設定
const storage = multer.diskStorage({
  destination: './PDF/', // 既存のPDFフォルダに保存
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// アップロード用APIの追加
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  // フロントエンドにファイルのパス（URL）を返す
  const fileUrl = `/PDF/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// 静的ファイルの配信（PDFフォルダの中身が見られるようにする）
app.use('/PDF', express.static(path.join(__dirname, 'PDF')));

// ...（既存のDB処理はそのまま）

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ...（既存の app.get, app.post, app.delete はそのまま）

app.use(express.static(__dirname));
app.listen(process.env.PORT || 3000);
