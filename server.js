const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// DATABASE_URLはRenderのEnvironmentから読み込まれます
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// アプリ起動時にテーブルを強制作成
pool.query(`
  CREATE TABLE IF NOT EXISTS job_list (
    id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    closest_station TEXT,
    memo TEXT,
    status TEXT NOT NULL
  );
`).then(() => console.log("Table check completed.")).catch(console.error);

app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_list ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const { company_name, closest_station, memo, status } = req.body;
    await pool.query(
      'INSERT INTO job_list (company_name, closest_station, memo, status) VALUES ($1, $2, $3, $4)',
      [company_name, closest_station, memo, status]
    );
    res.send('Success');
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM job_list WHERE id = $1', [req.params.id]);
    res.send('Deleted');
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(__dirname));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
