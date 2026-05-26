const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const MEMO_FILE = path.join(__dirname, 'additional_memo.txt');
if (!fs.existsSync(MEMO_FILE)) fs.writeFileSync(MEMO_FILE, '');

app.get('/api/memo', (req, res) => {
    res.json({ content: fs.readFileSync(MEMO_FILE, 'utf8') });
});

app.post('/api/memo', (req, res) => {
    fs.writeFileSync(MEMO_FILE, req.body.content);
    res.sendStatus(200);
});

// ファイル管理用
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.get('/api/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        res.json(files || []);
    });
});

const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ url: '/uploads/' + req.file.filename });
});

app.delete('/api/upload/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.sendStatus(200);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running`));
