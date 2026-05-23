const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_list (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      closest_station TEXT,
      memo TEXT,
      status TEXT NOT NULL
    );
  `);
};
initDatabase();

app.get('/api/jobs', async (req, res) => {
  const result = await pool.query('SELECT * FROM job_list ORDER BY id ASC');
  res.json(result.rows);
});

app.post('/api/jobs', async (req, res) => {
  const { company_name, closest_station, memo, status } = req.body;
  const result = await pool.query(
    'INSERT INTO job_list (company_name, closest_station, memo, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [company_name, closest_station, memo, status]
  );
  res.json(result.rows[0]);
});

app.delete('/api/jobs/:id', async (req, res) => {
  await pool.query('DELETE FROM job_list WHERE id = $1', [req.params.id]);
  res.send('Deleted');
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
