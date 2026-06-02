const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

// PDF保存用のルートディレクトリを確認してください
const STORAGE_ROOT = '/project/src/PDF';
const DIR_COMPANY = path.join(STORAGE_ROOT, 'company');
const DIR_DOCS = path.join(STORAGE_ROOT, 'documents');
const DATA_JSON_PATH = path.join(STORAGE_ROOT, 'data.json');

// ディレクトリがなければ作成する処理
if (!fs.existsSync(DIR_COMPANY)) fs.mkdirSync(DIR_COMPANY, { recursive: true });
if (!fs.existsSync(DIR_DOCS)) fs.mkdirSync(DIR_DOCS, { recursive: true });

app.use(express.static(path.join(__dirname, './')));
app.use('/data/company', express.static(DIR_COMPANY));
app.use('/data/documents', express.static(DIR_DOCS));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.headers['x-upload-type'];
        cb(null, type === 'docs' ? DIR_DOCS : DIR_COMPANY);
    },
    filename: (req, file, cb) => {
        cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'));
    }
});
const upload = multer({ storage });

// データ取得・保存API
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) {
        res.json(JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8')));
    } else {
        res.json({ memo: '', kento: [], owatta: [], yameta: [], additional: '' });
    }
});

app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
    res.status(200).json({ success: true });
});

// ファイルアップロードAPI
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.status(200).json({ success: true });
});

// ファイルリスト取得API
app.get('/api/files/company', (req, res) => {
    fs.readdir(DIR_COMPANY, (err, files) => {
        if (err) return res.json([]);
        res.json(files.map(f => ({ name: f, path: path.join(DIR_COMPANY, f), url: '/data/company/' + f })));
    });
});

app.get('/api/files/docs', (req, res) => {
    fs.readdir(DIR_DOCS, (err, files) => {
        if (err) return res.json([]);
        res.json(files.map(f => ({ name: f, path: path.join(DIR_DOCS, f), url: '/data/documents/' + f })));
    });
});

// ファイル削除API
app.post('/api/delete-file', (req, res) => {
    const filePath = req.body.path;
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.status(200).json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.listen(process.env.PORT || 3000);
