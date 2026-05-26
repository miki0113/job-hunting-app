const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });
const MEMO_FILE = './additional_memo.txt';

// 初期設定：ファイルがなければ作成
if (!fs.existsSync(MEMO_FILE)) fs.writeFileSync(MEMO_FILE, '');

// ルート設定（これで Cannot GET / が直ります）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// メモ取得API
app.get('/api/memo', (req, res) => {
    res.json({ content: fs.readFileSync(MEMO_FILE, 'utf8') });
});

// メモ保存API
app.post('/api/memo', (req, res) => {
    fs.writeFileSync(MEMO_FILE, req.body.content);
    res.sendStatus(200);
});

// その他のAPI（jobs, uploadなど）をここに記述してください
// 例: app.post('/api/upload', ...)

app.listen(3000, () => console.log('Server is running'));
