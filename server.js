const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 【ここが重要】__dirnameはサーバープログラムがある場所を指します
// publicフォルダがその階層にある前提で設定します
app.use(express.static(path.join(__dirname, 'public')));

const MEMO_FILE = path.join(__dirname, 'additional_memo.txt');
if (!fs.existsSync(MEMO_FILE)) fs.writeFileSync(MEMO_FILE, '');

// メモ取得API
app.get('/api/memo', (req, res) => {
    res.json({ content: fs.readFileSync(MEMO_FILE, 'utf8') });
});

// メモ保存API
app.post('/api/memo', (req, res) => {
    fs.writeFileSync(MEMO_FILE, req.body.content);
    res.sendStatus(200);
});

// アップロード処理
const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ url: '/PDF/' + req.file.filename });
});

// index.htmlを確実に返すルート
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
