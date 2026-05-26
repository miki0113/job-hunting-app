// HTMLにある <select id="common-select"> を動かすためのロジック
async function loadFileList() {
    try {
        // server.js側で app.get('/api/files', ...) を定義している前提
        const response = await fetch('/api/files');
        const fileList = await response.json(); // ここでJSON配列を受け取る

        const select = document.getElementById('common-select');
        select.innerHTML = '<option value="">-- 保存済みファイルを選択 --</option>';
        
        fileList.forEach(fileName => {
            const option = document.createElement('option');
            option.value = fileName;
            option.textContent = fileName;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("サーバーからのJSON取得に失敗しました", err);
    }
}
