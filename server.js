const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

const STORAGE_ROOT = '/project/src/PDF';
const DIR_COMPANY = path.join(STORAGE_ROOT, 'company');
const DIR_DOCS = path.join(STORAGE_ROOT, 'documents');
const DATA_JSON_PATH = path.join(STORAGE_ROOT, 'data.json');

// 各ディレクトリの作成
if (!fs.existsSync(DIR_COMPANY)) {
    fs.mkdirSync(DIR_COMPANY, { recursive: true });
}

if (!fs.existsSync(DIR_DOCS)) {
    fs.mkdirSync(DIR_DOCS, { recursive: true });
}

// 静的ファイルの配信
app.use(express.static(path.join(__dirname, './')));
app.use('/data/company', express.static(DIR_COMPANY));
app.use('/data/documents', express.static(DIR_DOCS));

// アップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadType = req.headers['x-upload-type'];
        if (uploadType === 'docs') {
            cb(null, DIR_DOCS);
        } else {
            cb(null, DIR_COMPANY);
        }
    },
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, originalName);
    }
});
const upload = multer({ storage });

// API: データ取得
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) {
        res.sendFile(DATA_JSON_PATH);
    } else {
        res.json({ memo: '', kento: [], owatta: [], yameta: [], additional: '' });
    }
});

// API: データ保存
app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// API: ファイルアップロード
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.sendStatus(200);
});

// API: 企業ファイルリスト取得
app.get('/api/files/company', (req, res) => {
    fs.readdir(DIR_COMPANY, (err, files) => {
        if (err) return res.json([]);
        const list = files.map(f => ({
            name: f,
            path: path.join(DIR_COMPANY, f),
            url: '/data/company/' + f
        }));
        res.json(list);
    });
});

// API: 書類ファイルリスト取得
app.get('/api/files/docs', (req, res) => {
    fs.readdir(DIR_DOCS, (err, files) => {
        if (err) return res.json([]);
        const list = files.map(f => ({
            name: f,
            path: path.join(DIR_DOCS, f),
            url: '/data/documents/' + f
        }));
        res.json(list);
    });
});

// API: ファイル削除
app.post('/api/delete-file', (req, res) => {
    const filePath = req.body.path;
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.sendStatus(200);
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(process.env.PORT || 3000);
