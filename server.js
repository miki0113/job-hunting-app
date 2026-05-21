const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// RenderのPostgreSQLに接続する設定
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

// データを取得するAPI
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_list ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// データを追加するAPI
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
