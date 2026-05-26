const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // 忘れずに
const app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cors());

// 起動時にPDFフォルダを確実に作る
const pdfDir = path.join(__dirname, 'PDF');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

const storage = multer.diskStorage({
    destination: pdfDir,
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use('/PDF', express.static(pdfDir));

// APIエンドポイント
app.get('/api/jobs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM job_list ORDER BY id ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs', async (req, res) => {
    const { company_name, closest_station, memo, status } = req.body;
    await pool.query('INSERT INTO job_list (company_name, closest_station, memo, status) VALUES ($1, $2, $3, $4)', 
        [company_name, closest_station, memo, status]);
    res.send('Success');
});

// ファイル一覧取得
app.get('/api/files', (req, res) => {
    fs.readdir(pdfDir, (err, files) => {
        if (err) return res.status(500).json([]);
        res.json(files);
    });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ url: `/PDF/${req.file.filename}` });
});

app.delete('/api/files/:name', (req, res) => {
    const filePath = path.join(pdfDir, req.params.name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.send('Deleted');
});

app.use(express.static(__dirname));
app.listen(process.env.PORT || 3000);
