const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

// 企業データはルートに配置（永続化のため）
const DATA_JSON_PATH = path.join(__dirname, 'data.json');
// アップロードされたファイル（PDF/Word/Excel等）は専用フォルダへ
const SYNC_DIR = '/project/src/PDF/data';

if (!fs.existsSync(SYNC_DIR)) fs.mkdirSync(SYNC_DIR, { recursive: true });

app.use(express.static(path.join(__dirname, './')));
app.use('/data', express.static(SYNC_DIR));

// 日本語ファイル名対応
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SYNC_DIR),
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + originalName);
    }
});
const upload = multer({ storage });

// 1. 企業データの管理（表のデータ）
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) res.sendFile(DATA_JSON_PATH);
    else res.json({ memo: '', kento: [], owatta: [], yameta: [] });
});

app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// 2. ファイルアップロード（PDF, Word, Excel）
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ url: '/data/' + req.file.filename });
});

// 3. ファイルリスト取得（上と下の両方で共有）
app.get('/api/files', (req, res) => {
    fs.readdir(SYNC_DIR, (err, files) => {
        if (err) return res.json([]);
        const list = files
            .filter(f => f !== 'data.json')
            .map(f => ({ name: f, url: '/data/' + f }));
        res.json(list);
    });
});

// 4. ファイル削除
app.delete('/api/files/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(SYNC_DIR, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.sendStatus(200);
    } else {
        res.status(404).send('File not found');
    }
});

app.listen(process.env.PORT || 3000);
