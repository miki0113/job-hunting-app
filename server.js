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
const URL_JSON_PATH = path.join(STORAGE_ROOT, 'urls.json');

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

app.get('/api/data', (req, res) => {
    const data = fs.existsSync(DATA_JSON_PATH) ? JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8')) : { memo: '', kininaru: [],kento: [], owatta: [], yameta: [], additional: '' };
    res.json(data);
});

app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
    res.status(200).json({ success: true });
});

app.post('/api/save-url', (req, res) => {
    let urls = fs.existsSync(URL_JSON_PATH) ? JSON.parse(fs.readFileSync(URL_JSON_PATH, 'utf8')) : [];
    urls.push({ name: req.body.name, url: req.body.url });
    fs.writeFileSync(URL_JSON_PATH, JSON.stringify(urls));
    res.status(200).json({ success: true });
});

app.post('/api/upload', upload.single('file'), (req, res) => res.status(200).json({ success: true }));

app.get('/api/files/docs', (req, res) => {
    fs.readdir(DIR_DOCS, (err, files) => {
        let fileList = err ? [] : files.map(f => ({ name: f, url: '/data/documents/' + f }));
        if (fs.existsSync(URL_JSON_PATH)) {
            const savedUrls = JSON.parse(fs.readFileSync(URL_JSON_PATH, 'utf8'));
            savedUrls.forEach(u => fileList.push({ name: u.name, url: u.url }));
        }
        res.json(fileList);
    });
});

app.post('/api/delete-file', (req, res) => {
    const { path: targetPath, name, url } = req.body;

    // 1. ファイル削除
    if (targetPath && targetPath.startsWith('/') && fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        return res.status(200).json({ success: true });
    } 
    // 2. URL削除（nameとurl両方が一致するものだけを削除）
    else if (name && url && fs.existsSync(URL_JSON_PATH)) {
        let urls = JSON.parse(fs.readFileSync(URL_JSON_PATH, 'utf8'));
        const filtered = urls.filter(u => !(u.url === url && u.name === name));
        fs.writeFileSync(URL_JSON_PATH, JSON.stringify(filtered));
        return res.status(200).json({ success: true });
    }
    res.status(404).json({ success: false, message: "削除対象が見つかりません" });
});

app.listen(process.env.PORT || 3000, () => console.log('Server running on port 3000'));
