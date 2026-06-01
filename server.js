const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

const STORAGE_ROOT = '/project/src/PDF';
const DIR_COMPANY = path.join(STORAGE_ROOT, 'company');
const DIR_DOCS = path.join(STORAGE_ROOT, 'documents');
// data.jsonのパスをルートに固定
const DATA_JSON_PATH = path.join(STORAGE_ROOT, 'data.json');

// (フォルダ作成・静的ファイル配信などの設定はそのまま)
if (!fs.existsSync(DIR_COMPANY)) fs.mkdirSync(DIR_COMPANY, { recursive: true });
if (!fs.existsSync(DIR_DOCS)) fs.mkdirSync(DIR_DOCS, { recursive: true });

app.use(express.static(path.join(__dirname, './')));
app.use('/data/company', express.static(DIR_COMPANY));
app.use('/data/documents', express.static(DIR_DOCS));

// (アップロード等の設定はそのまま)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadType = req.headers['x-upload-type'];
        cb(null, uploadType === 'docs' ? DIR_DOCS : DIR_COMPANY);
    },
    filename: (req, file, cb) => {
        cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'));
    }
});
const upload = multer({ storage });

// ★ここが重要：常に STORAGE_ROOT 直下の data.json を読み込む
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) {
        res.sendFile(DATA_JSON_PATH);
    } else {
        // もし直下にない場合、古い場所(data/data.json)も念のため確認して移行するロジック
        const OLD_PATH = path.join(STORAGE_ROOT, 'data', 'data.json');
        if (fs.existsSync(OLD_PATH)) {
            const data = fs.readFileSync(OLD_PATH);
            fs.writeFileSync(DATA_JSON_PATH, data);
            res.send(data);
        } else {
            res.json({ memo: '', kento: [], owatta: [], yameta: [], additional: '' });
        }
    }
});

app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// (以下 API: アップロード・リスト・削除は前回のコードと同じ)
// ...
