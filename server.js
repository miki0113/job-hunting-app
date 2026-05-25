const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();

// 1. DB接続設定を一番上に
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

app.use(express.json());
app.use(cors());

// 2. アップロード設定
const storage = multer.diskStorage({
  destination: './PDF/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/PDF/${req.file.filename}` });
});

app.use('/PDF', express.static(path.join(__dirname, 'PDF')));

// 3. APIエンドポイント（ここから下に配置）
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_list ORDER BY id ASC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({error: e.message}); }
});

app.post('/api/jobs', async (req, res) => {
  const { company_name, closest_station, memo, status } = req.body;
  await pool.query('INSERT INTO job_list (company_name, closest_station, memo, status) VALUES ($1, $2, $3, $4)', 
    [company_name, closest_station, memo, status]);
  res.send('Success');
});

app.delete('/api/jobs/:id', async (req, res) => {
  await pool.query('DELETE FROM job_list WHERE id = $1', [req.params.id]);
  res.send('Deleted');
});

app.use(express.static(__dirname));
app.listen(process.env.PORT || 3000);
