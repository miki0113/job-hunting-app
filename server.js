const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(express.static('public')); // HTML等の静的ファイル置き場

// 保存先ディレクトリの定義
const BASE_DIR = '/project/src/PDF';
const DATA_DIR = path.join(BASE_DIR, 'data');
const SYNC_DIR = path.join(BASE_DIR, 'sync');

// ディレクトリが存在しない場合は作成
[DATA_DIR, SYNC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SYNC_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// データ取得・保存API
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

// ファイルアップロードAPI
app.post('/api/upload-sync', upload.single('file'), (req, res) => {
    res.json({ url: '/sync/' + req.file.filename });
});

// ファイル一覧取得API
app.get('/api/files-sync', (req, res) => {
    fs.readdir(SYNC_DIR, (err, files) => {
        res.json(files || []);
    });
});

// ファイル削除API
app.delete('/api/upload-sync/:filename', (req, res) => {
    fs.unlinkSync(path.join(SYNC_DIR, req.params.filename));
    res.sendStatus(200);
});

// 同期用ファイル公開設定
app.use('/sync', express.static(SYNC_DIR));

app.listen(process.env.PORT || 3000, () => {
    console.log('Server started on Render persistent disk path:', BASE_DIR);
});
