/**
 * main.ts
 *
 * このファイルには「実行の流れ」を司るシナリオ関数をまとめる。
 * ボタンやメニューなどから呼び出す想定で以下2関数を用意:
 *
 *  1) fetchTargetFilesAndWriteLog()
 *     - Configシートの条件を読み取り
 *     - Drive上で該当ファイルを検索
 *     - Logシートに一覧を書き出す
 *       (削除コメント, 削除日列は空のまま)
 *
 *  2) deleteFilesFromLog()
 *     - Logシートを参照
 *     - まだ削除されていない (Deleted At 列が空) & Skip/Comment 列が空 のファイルを実際に削除
 *     - 削除日(Deleted At)を記録
 */

// =====================
// ボタン1: ファイル取得＆ログ書き出し
// =====================
function fetchTargetFilesAndWriteLog(): void {
    // 1) Configシートから条件を読み取り
    const config = readConfigFromSheet(); // config.ts内の関数

    // 2) Driveから条件に合うファイルを取得
    const files = getTargetFiles(
        config.folderUrl,
        config.yearMonth,
        config.minSize,
        config.ownerEmail
    ); // driveUtils.ts内の関数

    // 3) Logシートに書き出し
    writeFilesToLogSheet(files); // logUtils.ts内の関数

    // メッセージ
    Logger.log(`完了: 条件に合うファイル ${files.length} 件をLogシートへ書き出しました。`);
    // SpreadsheetApp.getUi().alert(`完了: 条件に合うファイル ${files.length} 件をLogシートへ書き出しました。`);　//スケジューラーで呼び出すことも考えて、アラートはコメントアウト
}

// =====================
// ボタン2: ログを見て実際に削除
// =====================
function deleteFilesFromLog(): void {
    // 1) Logシートから「まだ削除されていない」行を取得
    //    ＝ DeletedAt列が空の行
    const notDeletedRows = getNotDeletedRows(); // logUtils.ts内の関数

    if (notDeletedRows.length === 0) {
        Logger.log("削除対象となる行はありません。");
        //SpreadsheetApp.getUi().alert("削除対象となる行はありません。"); //スケジューラーで呼び出すことも考えて、アラートはコメントアウト
        return;
    }

    // 2) そのうち、「Skip/Comment 列が空」の行を削除対象とする
    const rowsToDelete = notDeletedRows.filter(row => {
        return !row.skipComment; // skipComment が空文字の場合のみ削除対象
    });

    // 3) 実際に削除を実行 (Driveのファイルをゴミ箱に移動)
    let deleteCount = 0;
    rowsToDelete.forEach((row) => {
        const fileId = row.fileId;
        try {
            const file = DriveApp.getFileById(fileId);
            file.setTrashed(true);
            deleteCount++;

            // 4) Logシートの DeletedAt 列に現在時刻を記録
            updateDeletedAt(row.rowIndex, new Date()); // logUtils.ts内の関数
        } catch (e) {
            Logger.log(`ファイル削除失敗(ID=${fileId}): ${e}`);
        }
    });

    Logger.log(`完了: ${deleteCount} 件を削除しました。`);
    SpreadsheetApp.getUi().alert(`完了: ${deleteCount} 件を削除しました。`);
}
