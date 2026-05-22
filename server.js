const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- 💾 ディスクとフォルダの設定 ---
// Renderの追加ディスク（/project/src/PDF）があれば使い、なければローカルを使います
const UPLOAD_DIR = fs.existsSync('/project/src/PDF') 
    ? '/project/src/PDF' 
    : (fs.existsSync('/PDF') ? '/PDF' : path.join(__dirname, 'PDF'));

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 保存先フォルダ（UPLOAD_DIR）を確実にmulterに認識させ、日本語の文字化けを防ぐ
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

// --- ⏬ データベース（PostgreSQL）の設定 ⏬ ---
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
// --- ⏫ データベースの設定ここまで ⏫ ---


// --- 📂 ファイル操作のAPI（ミキさんの元の機能を完全維持＋拡張） ---

// 1. ファイル一覧取得（特定の会社名やサンプルを除外するフィルター条件もそのままです）
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

// 3. 【★強化版】ファイルを表示/ダウンロード用に返す設定
// PDFはブラウザでインライン表示、エクセルやワードはGoogleビューアーで強制Web表示させます
app.get('/PDF/:name', (req, res) => {
    const filename = req.params.name;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('ファイルが見つかりません');
    }

    const ext = path.extname(filename).toLowerCase();

    // PDFファイルの場合はブラウザの標準ビューアーでインライン表示
    if (ext === '.pdf') {
        res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
        res.setHeader('Content-Type', 'application/pdf');
        return res.sendFile(filePath);
    } 

    // エクセル・ワードの場合はGoogleドキュメントビューアーを強制経由してブラウザ内で開く（強制ダウンロードを防止）
    if (ext === '.xlsx' || ext === '.xls' || ext === '.docx' || ext === '.doc') {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        
        // Googleがファイルを読み込みに来るためのURLを生成
        const filePublicUrl = `${protocol}://${host}/raw-file/${encodeURIComponent(filename)}`;
        const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(filePublicUrl)}&embedded=true`;
        
        // Googleビューアーの画面へ強制リダイレクト
        return res.redirect(googleViewerUrl);
    }

    // その他のファイルは通常表示
    res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
    res.sendFile(filePath);
});

// 🛠️ Googleビューアーがファイルをネット経由で読み込むための生ファイル配信ルート
app.get('/raw-file/:name', (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.name);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not Found');
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


// --- 🚀 サーバー起動設定 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Using directory: ${UPLOAD_DIR}`);
});