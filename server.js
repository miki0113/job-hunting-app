const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

const STORAGE_ROOT = '/project/src/PDF';
const DATA_JSON_PATH = path.join(STORAGE_ROOT, 'data.json');

app.use(express.static(path.join(__dirname, './')));
app.use('/data', express.static(STORAGE_ROOT));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, STORAGE_ROOT),
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + originalName);
    }
});
const upload = multer({ storage });

app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_JSON_PATH)) res.sendFile(DATA_JSON_PATH);
    else res.json({ memo: '', kento: [], owatta: [], yameta: [], additional: '' });
});

app.post('/api/data', (req, res) => {
    fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ url: '/data/' + req.file.filename });
});

app.get('/api/files', (req, res) => {
    fs.readdir(STORAGE_ROOT, (err, files) => {
        if (err) return res.json([]);
        const list = files
            .filter(f => f !== 'data.json')
            .map(f => ({ name: f, url: '/data/' + f }));
        res.json(list);
    });
});

app.delete('/api/files/:filename', (req, res) => {
    const filePath = path.join(STORAGE_ROOT, req.params.filename);
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); res.sendStatus(200); }
    else res.status(404).send('Not found');
});

app.listen(process.env.PORT || 3000);
