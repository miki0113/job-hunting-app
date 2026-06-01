const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

const BASE_DIR = '/project/src/PDF';
const DATA_JSON_PATH = path.join(BASE_DIR, 'data.json'); // 企業データ（1ファイルで管理）
const SYNC_DIR = path.join(BASE_DIR, 'data');            // 求人票PDF用（元データの保存先）
const BACKUP_DIR = path.join(BASE_DIR, 'temp_backup');   // バックアップ用

// ディレクトリ初期化
[SYNC_DIR, BACKUP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 静的ファイルの配信
app.use(express.static(path.join(__dirname, './')));
app.use('/data', express.static(SYNC_DIR));

// 日本語ファイル名対応の設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SYNC_DIR),
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + originalName);
    }
});
const upload = multer({ storage });

// 企業データの取得・保存
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) {
        res.sendFile(DATA_JSON_PATH);
    } else {
        res.json({ memo: '', kento: [], owatta: [], yameta: [] });
    }
});

app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body));
    res.sendStatus(200);
});

// 求人票の管理
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ url: '/data/' + req.file.filename });
});

app.get('/api/files', (req, res) => {
    fs.readdir(SYNC_DIR, (err, files) => {
        const fileList = (files || []).map(f => ({ name: f, url: '/data/' + f }));
        res.json(fileList);
    });
});

app.delete('/api/files/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(SYNC_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);

    if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, backupPath);
        res.sendStatus(200);
    } else {
        res.status(404).send('File not found');
    }
});

app.listen(process.env.PORT || 3000);
