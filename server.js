const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

// 【修正箇所】Render環境で動作するように現在のディレクトリ配下のPDFフォルダを指定
const STORAGE_ROOT = path.join(__dirname, 'PDF');
const DIR_COMPANY = path.join(STORAGE_ROOT, 'company');
const DIR_DOCS = path.join(STORAGE_ROOT, 'documents');
const DATA_JSON_PATH = path.join(STORAGE_ROOT, 'data.json');

// ディレクトリ作成
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

// データAPI
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

// ファイルアップロード
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.status(200).json({ success: true });
});

// ファイルリスト取得
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

// 削除API（デバッグログ入り）
app.post('/api/delete-file', (req, res) => {
    const filePath = req.body.path;
    console.log("削除対象パス:", filePath);
    
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            res.status(200).json({ success: true });
        } catch (err) {
            console.error("削除エラー:", err);
            res.status(500).json({ success: false });
        }
    } else {
        res.status(404).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
