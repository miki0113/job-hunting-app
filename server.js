const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const MEMO_FILE = './additional_memo.txt';
if (!fs.existsSync(MEMO_FILE)) fs.writeFileSync(MEMO_FILE, '');

// メモ取得
app.get('/api/memo', (req, res) => {
    res.json({ content: fs.readFileSync(MEMO_FILE, 'utf8') });
});

// メモ保存
app.post('/api/memo', (req, res) => {
    fs.writeFileSync(MEMO_FILE, req.body.content);
    res.sendStatus(200);
});

// ...他のAPI（jobs, uploadなど）の記述はここに入れる...

app.listen(3000, () => console.log('Server running'));
