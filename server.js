const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

// 【重要】Renderの「Disks」設定を確認してください
// もしRenderの設定画面で「/var/data」にディスクをマウントしているなら、
// STORAGE_ROOTを '/var/data' に変更する必要があります。
const STORAGE_ROOT = process.env.DATA_PATH || path.join(__dirname, 'PDF');
const DATA_JSON_PATH = path.join(STORAGE_ROOT, 'data.json');

console.log("------------------------------------------");
console.log("データ読み込み先:", DATA_JSON_PATH);
console.log("ファイルは存在するか?:", fs.existsSync(DATA_JSON_PATH));
console.log("------------------------------------------");

// 以下、前回同様の処理
const DIR_COMPANY = path.join(STORAGE_ROOT, 'company');
const DIR_DOCS = path.join(STORAGE_ROOT, 'documents');

if (!fs.existsSync(DIR_COMPANY)) fs.mkdirSync(DIR_COMPANY, { recursive: true });
if (!fs.existsSync(DIR_DOCS)) fs.mkdirSync(DIR_DOCS, { recursive: true });

app.use(express.static(path.join(__dirname, './')));
app.use('/data/company', express.static(DIR_COMPANY));
app.use('/data/documents', express.static(DIR_DOCS));

// API: データ取得
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) {
        res.json(JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8')));
    } else {
        res.json({ memo: '', kento: [], owatta: [], yameta: [], additional: '' });
    }
});

// API: データ保存
app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
    res.status(200).json({ success: true });
});

// (その他APIは省略... 以前のものと同じです)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
