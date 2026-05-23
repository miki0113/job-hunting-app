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
const UPLOAD_DIR = fs.existsSync('/project/src/PDF') 
    ? '/project/src/PDF' 
    : (fs.existsSync('/PDF') ? '/PDF' : path.join(__dirname, 'PDF'));

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { 
        cb(null, UPLOAD_DIR); 
    },
    filename: (req, file, cb) => {
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

app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_list ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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


// --- 📂 ファイル操作のAPI ---

app.get('/api/files', (req, res) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
        if (err) return res.json([]);
        const filtered = files.filter(name => 
            !name.startsWith("RAFAA") && 
            !name.includes("板倉病院") && 
            !name.includes("日警保安") && 
            name !== "sample.pdf" &&
            !name.startsWith(".")
        );
        res.json(filtered);
    });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('ファイルがありません');
    }
    res.send('Uploaded');
});

// 3. ファイルを表示する設定（古いコードの正常な返却処理をベースにスマホ・PCを分岐）
app.get('/PDF/:name', (req, res) => {
    const filename = req.params.name;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('ファイルが見つかりません');
    }

    const ext = path.extname(filename).toLowerCase();

    // Microsoftが直接ファイルを読み込める生のURLを組み立て（クエリを付けて確実にファイルを返却）
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/PDF/${encodeURIComponent(filename)}?download=true`;

    // Microsoftのサーバーからのアクセス、またはダウンロード要求の場合は、古いコードと同じ処理でファイルをそのまま返す
    if (req.query.download === 'true' || (req.headers['user-agent'] && req.headers['user-agent'].includes('OfficeActualDownload'))) {
        if (ext === '.docx' || ext === '.doc') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        } else if (ext === '.xlsx' || ext === '.xls') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        }
        res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
        return res.sendFile(filePath);
    }

    // 通常のブラウザアクセス（ミキさんがボタンを押した時）の挙動
    if (ext === '.xlsx' || ext === '.xls' || ext === '.docx' || ext === '.doc') {
        const userAgent = req.headers['user-agent'] || '';
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

        if (isMobile) {
            // 【スマホの場合】Wordアプリを直接叩き起こすURL
            const officeMobileUrl = `ms-word:ofe|u|${encodeURIComponent(fileUrl)}`;
            return res.redirect(officeMobileUrl);
        } else {
            // 【PCの場合】ブラウザの中でPC版Wordメニューが出るオンライン編集画面へ移動
            const officePcUrl = `https://view.officeapps.live.com/op/edit.aspx?src=${encodeURIComponent(fileUrl)}`;
            return res.redirect(officePcUrl);
        }
    }

    // PDFなどの場合
    if (ext === '.pdf') {
        res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
        res.setHeader('Content-Type', 'application/pdf');
        return res.sendFile(filePath);
    } 

    res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
    res.sendFile(filePath);
});

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
