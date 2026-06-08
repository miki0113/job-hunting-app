const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

// 以前の正常に動いていた環境に合わせるため、パスを動的に解決します
// __dirname は実行中のサーバーファイルのディレクトリを指します
const STORAGE_ROOT = path.join(__dirname, 'PDF');
const DIR_COMPANY = path.join(STORAGE_ROOT, 'company');
const DIR_DOCS = path.join(STORAGE_ROOT, 'documents');
const DATA_JSON_PATH = path.join(STORAGE_ROOT, 'data.json');

console.log("サーバー起動：データ確認中...");
console.log("探索パス:", DATA_JSON_PATH);
console.log("ファイルは存在するか:", fs.existsSync(DATA_JSON_PATH));

// ディレクトリ初期化
if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true });
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

// データ読み込みの堅牢化
app.get('/api/data', (req, res) => {
    try {
        if (fs.existsSync(DATA_JSON_PATH)) {
            const data = fs.readFileSync(DATA_JSON_PATH, 'utf8');
            res.json(JSON.parse(data));
        } else {
            console.log("警告: data.jsonが見つかりません。パス:", DATA_JSON_PATH);
            res.json({ memo: '', kento: [], owatta: [], yameta: [], additional: '' });
        }
    } catch (e) {
        console.error("JSON解析エラー:", e);
        res.status(500).json({ error: "データの読み込みに失敗しました" });
    }
});

app.post('/api/data', (req, res) => {
    try {
        fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    res.status(200).json({ success: true });
});

app.get('/api/files/company', (req, res) => {
    fs.readdir(DIR_COMPANY, (err, files) => {
        if (err) return res.json([]);
        res.json(files.map(f => ({ name: f, url: '/data/company/' + f })));
    });
});

app.get('/api/files/docs', (req, res) => {
    fs.readdir(DIR_DOCS, (err, files) => {
        if (err) return res.json([]);
        res.json(files.map(f => ({ name: f, url: '/data/documents/' + f })));
    });
});

app.post('/api/delete-file', (req, res) => {
    const filePath = req.body.path;
    // ファイルがSTORAGE_ROOT配下にあるか厳密にチェック
    if (filePath && filePath.startsWith(STORAGE_ROOT) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.status(200).json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`サーバーがポート ${PORT} で起動しました`));
