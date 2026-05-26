const express = require('express');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); 

const DATA_FILE = 'data.json';
const UPLOAD_DIR = 'uploads/';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ kento: [], owatta: [], yameta: [], memo: "" }));

// データの読み込み・保存API
app.get('/api/data', (req, res) => res.json(JSON.parse(fs.readFileSync(DATA_FILE))));
app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body));
    res.send({ status: 'success' });
});

// ファイルアップロード用
const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, file.originalname)
})});

app.post('/api/upload', upload.single('file'), (req, res) => res.json({ url: '/uploads/' + req.file.originalname }));
app.get('/api/files', (req, res) => res.json(fs.readdirSync(UPLOAD_DIR)));
app.delete('/api/upload/:filename', (req, res) => { fs.unlinkSync(UPLOAD_DIR + req.params.filename); res.send({ status: 'deleted' }); });
app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));