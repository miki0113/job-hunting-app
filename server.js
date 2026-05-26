const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// publicフォルダを静的ファイルとして公開
app.use(express.static(path.join(__dirname, 'public')));

const MEMO_FILE = path.join(__dirname, 'additional_memo.txt');
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

// すべてのルートでindex.htmlを返す（フロントエンドのルーティング対策）
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
