const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

// 企業データはルートディレクトリに配置（再起動時の永続化のため）
const DATA_JSON_PATH = path.join(__dirname, 'data.json');
// ファイル類は専用ディレクトリへ
const BASE_DIR = '/project/src/PDF';
const SYNC_DIR = path.join(BASE_DIR, 'data');
const BACKUP_DIR = path.join(BASE_DIR, 'temp_backup');

[SYNC_DIR, BACKUP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 静的ファイルの配信（ブラウザで直接開く設定）
app.use(express.static(path.join(__dirname, './')));
// PDF/Word/Excel等をブラウザ表示可能にする設定
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

// 企業データの管理
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) {
        res.sendFile(DATA_JSON_PATH);
    } else {
        res.json({ memo: '', kento: [], owatta: [], yameta: [] });
    }
});

app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// ファイルアップロード
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ url: '/data/' + req.file.filename });
});

// ドロップダウン用リスト（data.jsonを除外）
app.get('/api/files', (req, res) => {
    fs.readdir(SYNC_DIR, (err, files) => {
        if (err) return res.json([]);
        const list = files
            .filter(f => f !== 'data.json')
            .map(f => ({ name: f, url: '/data/' + f }));
        res.json(list);
    });
});

// 削除機能（バックアップ移動）
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
