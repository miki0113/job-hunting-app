const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

const BASE_DIR = '/project/src/PDF';
const DATA_DIR = path.join(BASE_DIR, 'data');
const SYNC_DIR = path.join(BASE_DIR, 'sync');
const BACKUP_DIR = path.join(BASE_DIR, 'temp_backup');

[DATA_DIR, SYNC_DIR, BACKUP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(express.static(path.join(__dirname, './')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SYNC_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.get('/api/data', (req, res) => {
    const filePath = path.join(DATA_DIR, 'data.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.json({ memo: '', kento: [], owatta: [], yameta: [] });
    }
});

app.post('/api/data', (req, res) => {
    fs.writeFileSync(path.join(DATA_DIR, 'data.json'), JSON.stringify(req.body));
    res.sendStatus(200);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ url: '/sync/' + req.file.filename });
});

app.get('/api/files', (req, res) => {
    fs.readdir(SYNC_DIR, (err, files) => res.json(files || []));
});

// 修正済み：Webサイトからの削除要求を正しく受け取り、安全に退避させる
app.delete('/api/files/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(SYNC_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);

    if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, backupPath); // 削除ではなく安全な移動に変更
        res.sendStatus(200);
    } else {
        res.status(404).send('File not found');
    }
});

app.use('/sync', express.static(SYNC_DIR));

app.listen(process.env.PORT || 3000);
