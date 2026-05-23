const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- 💾 Renderの追加ディスク（マウントパス）を最優先で絶対固定 ---
const UPLOAD_DIR = fs.existsSync('/project/src/PDF') 
    ? '/project/src/PDF' 
    : path.join(__dirname, 'PDF');

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

// テーブルに「分類（status）」を保存できるように確実に初期化
const initDatabase = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS job_list (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      closest_station TEXT,
      memo TEXT,
      status TEXT NOT NULL,
      pdf_file TEXT
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

// データを取得するAPI
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_list ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// データを追加するAPI（すべての表の分類に対応）
app.post('/api/jobs', async (req, res) => {
  const { company_name, closest_station, memo, status, pdf_file } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO job_list (company_name, closest_station, memo, status, pdf_file) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [company_name, closest_station, memo, status || '検討中の企業', pdf_file || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// データのステータス（分類）を更新・編集するAPI
app.put('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const { status, company_name, closest_station, memo, pdf_file } = req.body;
  try {
    const result = await pool.query(
      'UPDATE job_list SET company_name=$1, closest_station=$2, memo=$3, status=$4, pdf_file=$5 WHERE id=$6 RETURNING *',
      [company_name, closest_station, memo, status, pdf_file, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// データを削除するAPI
app.delete('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM job_list WHERE id = $1', [id]);
    res.send('Deleted job');
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

// ファイル表示API
app.get('/PDF/:name', (req, res) => {
    const filename = req.params.name;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('ファイルが見つかりません');
    }

    const ext = path.extname(filename).toLowerCase();
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/PDF/${encodeURIComponent(filename)}?download=true`;

    if (req.query.download === 'true' || (req.headers['user-agent'] && req.headers['user-agent'].includes('OfficeActualDownload'))) {
        if (ext === '.docx' || ext === '.doc') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        } else if (ext === '.xlsx' || ext === '.xls') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        }
        res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
        return res.sendFile(filePath);
    }

    if (ext === '.xlsx' || ext === '.xls' || ext === '.docx' || ext === '.doc') {
        const userAgent = req.headers['user-agent'] || '';
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

        if (isMobile) {
            const officeMobileUrl = `ms-word:ofe|u|${encodeURIComponent(fileUrl)}`;
            return res.redirect(officeMobileUrl);
        } else {
            const officePcUrl = `https://view.officeapps.live.com/op/edit.aspx?src=${encodeURIComponent(fileUrl)}`;
            return res.redirect(officePcUrl);
        }
    }

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
