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
const URL_JSON_PATH = path.join(STORAGE_ROOT, 'urls.json'); // URL保存用ファイル

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

// 【追加】URL保存API
app.post('/api/save-url', (req, res) => {
    let urls = [];
    if (fs.existsSync(URL_JSON_PATH)) {
        urls = JSON.parse(fs.readFileSync(URL_JSON_PATH, 'utf8'));
    }
    urls.push(req.body.url);
    fs.writeFileSync(URL_JSON_PATH, JSON.stringify(urls));
    res.status(200).json({ success: true });
});

// ファイルアップロードAPI
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.status(200).json({ success: true });
});

// ファイルとURLを両方返すAPI
app.get('/api/files/docs', (req, res) => {
    fs.readdir(DIR_DOCS, (err, files) => {
        let fileList = err ? [] : files.map(f => ({ name: f, url: '/data/documents/' + f }));
        // 保存したURLを追加
        if (fs.existsSync(URL_JSON_PATH)) {
            const savedUrls = JSON.parse(fs.readFileSync(URL_JSON_PATH, 'utf8'));
            savedUrls.forEach(u => fileList.push({ name: u, url: u }));
        }
        res.json(fileList);
    });
});

// ファイル削除API（URLにも対応）
app.post('/api/delete-file', (req, res) => {
    const targetPath = req.body.path;
    // 物理ファイルの場合
    if (targetPath.startsWith(DIR_COMPANY) || targetPath.startsWith(DIR_DOCS)) {
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            return res.status(200).json({ success: true });
        }
    } 
    // URLの場合（URL_JSONから削除）
    else if (fs.existsSync(URL_JSON_PATH)) {
        let urls = JSON.parse(fs.readFileSync(URL_JSON_PATH, 'utf8'));
        const filtered = urls.filter(u => u !== targetPath.replace('/project/src/PDF/documents/', ''));
        fs.writeFileSync(URL_JSON_PATH, JSON.stringify(filtered));
        return res.status(200).json({ success: true });
    }
    res.status(404).json({ success: false });
});

app.listen(process.env.PORT || 3000, () => {
    console.log('Server running on port 3000');
});
