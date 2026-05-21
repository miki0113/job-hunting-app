const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg'); // 新しいデータベース用の設定を追加
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Renderの課金ディスク（/PDF）があればそこを使い、なければパソコンのフォルダを使います
const UPLOAD_DIR = fs.existsSync('/PDF') ? '/PDF' : path.join(__dirname, 'PDF');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 保存先フォルダ（UPLOAD_DIR）を確実にmulterに認識させました
const storage = multer.diskStorage({
    destination: (req, file, cb) => { 
        cb(null, UPLOAD_DIR); 
    },
    filename: (req, file, cb) => {
        // 日本語のファイル名が文字化けしないように復元する処理
        const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, safeName);
    }
});
const upload = multer({ storage: storage });

app.use(express.static(__dirname));

// --- ⏬ ここから新しいデータベース（PostgreSQL）の設定 ⏬ ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 起動時にテーブル（データを入れる表）を自動で作る
const initDatabase = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS job_list (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      closest_station TEXT,
      memo TEXT,
      status TEXT NOT NULL
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log('Database table is ready.');
  } catch (err) {
    console.error('Error creating table:', err);
  }
};
initDatabase();

// データベースから就活リストを取得するAPI
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_list ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// データベースに就活リストを追加するAPI
app.post('/api/jobs', async (req, res) => {
  const { company_name, closest_station, memo, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO job_list (company_name, closest_station, memo, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [company_name, closest_station, memo, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- ⏫ ここまで新しいデータベースの設定 ⏫ ---

// 1. ファイル一覧取得（元のフィルター条件をそのまま維持）
app.get('/api/files', (req, res) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
        if (err) return res.json([]);
        const filtered = files.filter(name => 
            !name.startsWith("RAFAA") && 
            !name.includes("板倉病院") && 
            !name.includes("日警保安") && 
            name !== "sample.pdf" &&
            !name.startsWith(".") // 隠しファイルを除外
        );
        res.json(filtered);
    });
});

// 2. ファイルアップロード（修正したupload設定を正しく適用）
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('ファイルがありません');
    }
    res.send('Uploaded');
});

// 3. ファイルを表示/ダウンロード用に返す設定
app.get('/PDF/:name', (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.name);
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(req.params.name) + '"');
        res.sendFile(filePath);
    } else {
        res.status(404).send('ファイルが見つかりません');
    }
});

// 4. ファイル削除
app.delete('/api/files/:name', (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.name);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.send('Deleted');
    } else {
        res.status(404).send('Not found');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Using directory: ${UPLOAD_DIR}`);
});
