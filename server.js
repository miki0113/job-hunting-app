const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 【修正】publicフォルダではなく、今の階層（__dirname）を静的ファイル置き場にする
app.use(express.static(__dirname));

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

// 【修正】ルート('/')にアクセスが来たら index.html を返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
