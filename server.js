const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

// 【重要】Renderのディスクマウントパス
const BASE_DIR = '/project/src/PDF';
const DATA_DIR = path.join(BASE_DIR, 'data');
const SYNC_DIR = path.join(BASE_DIR, 'sync');

// ディレクトリ作成
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SYNC_DIR)) fs.mkdirSync(SYNC_DIR, { recursive: true });

// 静的ファイルの提供設定（HTMLやCSSが読み込めないエラーの修正）
// ここに index.html を配置しているディレクトリを指定してください
app.use(express.static(path.join(__dirname, 'public'))); 

// ルートパスで index.html を返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, SYNC_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// データ管理API
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

// 同期ファイルAPI
app.post('/api/upload-sync', upload.single('file'), (req, res) => {
    res.json({ url: '/sync/' + req.file.filename });
});

app.get('/api/files-sync', (req, res) => {
    fs.readdir(SYNC_DIR, (err, files) => {
        res.json(files || []);
    });
});

app.delete('/api/upload-sync/:filename', (req, res) => {
    const filePath = path.join(SYNC_DIR, req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.sendStatus(200);
});

// ファイル公開
app.use('/sync', express.static(SYNC_DIR));

app.listen(process.env.PORT || 3000, () => {
    console.log('Server running on port 3000');
});
