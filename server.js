const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

// 企業データはルートに配置
const DATA_JSON_PATH = path.join(__dirname, 'data.json');
const SYNC_DIR = '/project/src/PDF/data';

if (!fs.existsSync(SYNC_DIR)) fs.mkdirSync(SYNC_DIR, { recursive: true });

app.use(express.static(path.join(__dirname, './')));
app.use('/data', express.static(SYNC_DIR));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SYNC_DIR),
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + originalName);
    }
});
const upload = multer({ storage });

// 企業データの取得（データがない場合は空の構造を返す）
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) {
        res.sendFile(DATA_JSON_PATH);
    } else {
        // 初期状態を定義
        const emptyData = { memo: '', kento: [], owatta: [], yameta: [] };
        res.json(emptyData);
    }
});

// 企業データの保存
app.post('/api/data', (req, res) => {
    try {
        fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
        res.sendStatus(200);
    } catch (e) {
        res.status(500).send('Save failed');
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ url: '/data/' + req.file.filename });
});

app.get('/api/files', (req, res) => {
    fs.readdir(SYNC_DIR, (err, files) => {
        if (err) return res.json([]);
        const list = files
            .filter(f => f !== 'data.json')
            .map(f => ({ name: f, url: '/data/' + f }));
        res.json(list);
    });
});

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
