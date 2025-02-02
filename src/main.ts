/**
 * main.ts
 *
 * - fetchTargetFilesAndWriteLogInChunks:
 *   Drive上のファイルをイテレートしつつ、Configの条件(最終更新月, サイズ, オーナー)をチェック。
 *   一致するファイルだけログに書き込む（チャンク処理）
 *
 * - deleteFilesFromLogInChunks:
 *   FileLogシートを参照し、未削除かつSkip/Commentが空のファイルをチャンクで削除
 */

// 1回の実行で最大何件のファイルをログに書き出すか
const MAX_FILE_PROCESS_FETCH = 2000;
// 1度のシート書き込みチャンクサイズ
const CHUNK_SIZE_FETCH = 200;

// 削除処理の制限
const MAX_FILE_PROCESS_DELETE = 400;
const CHUNK_SIZE_DELETE = 100;

/**
 * (1) Driveファイルを取得して、FileLog シートへ書き込む（チャンク対応版 + フィルタリング）
 */
function fetchTargetFilesAndWriteLogInChunks(): void {
    const config = readConfigFromSheet();   // ここで targetYear/month, minSize, ownerEmail を取得
    if (!config.folderUrl) {
        Logger.log("フォルダURLが未設定です。");
        return;
    }

    // フォルダ内のファイル取得用イテレータ + すでにログにあるFileID一覧(Set)
    const { fileIterator, existingFileIds } = getMatchingFileIterator(config);

    let totalCount = 0;
    let batchBuffer: GoogleAppsScript.Drive.File[] = [];

    while (fileIterator.hasNext()) {
        const file = fileIterator.next();

        // 既存ログに同じFile IDがあればスキップ
        if (existingFileIds.has(file.getId())) {
            continue;
        }

        // ★★★ ここでフィルタリング
        if (!isFileMatch(file, config)) {
            // もし条件(更新日, サイズ, オーナー等)に合わなければスキップ
            continue;
        }

        // フィルタを通ったファイルのみバッファに格納
        batchBuffer.push(file);
        totalCount++;

        // チャンクに達した or MAX超過ならシート書き込み
        if (batchBuffer.length >= CHUNK_SIZE_FETCH) {
            writeFilesToLogSheet(batchBuffer);
            batchBuffer = [];
        }
        if (totalCount >= MAX_FILE_PROCESS_FETCH) {
            // 1回の実行で上限に達したので終了
            break;
        }
    }

    // 残りのバッファを書き込み
    if (batchBuffer.length > 0) {
        writeFilesToLogSheet(batchBuffer);
    }

    Logger.log(`完了: ${totalCount}件 をログに書き出しました。`);
    // SpreadsheetApp.getUi().alert(`完了: ${totalCount}件 をログに書き出しました。`);
}


/**
 * (2) FileLog シートを見て、まだ削除されていない＆Skip/Commentが空のファイルを削除（チャンク対応版）
 */
function deleteFilesFromLogInChunks(): void {
    const notDeleted = getNotDeletedRows();
    if (notDeleted.length === 0) {
        Logger.log("削除対象行なし。");
        return;
    }

    // Skip/Comment が空のものだけ削除対象
    const targets = notDeleted.filter(row => !row.skipComment);

    if (targets.length === 0) {
        Logger.log("Skip/Comment が書かれているため削除対象行なし。");
        return;
    }

    let totalDeleted = 0;
    let batchBuffer: LogRow[] = [];

    for (let i = 0; i < targets.length; i++) {
        batchBuffer.push(targets[i]);

        if (batchBuffer.length >= CHUNK_SIZE_DELETE) {
            deleteAndLog(batchBuffer);
            totalDeleted += batchBuffer.length;
            batchBuffer = [];

            if (totalDeleted >= MAX_FILE_PROCESS_DELETE) {
                break;
            }
        }
    }

    // 残り
    if (batchBuffer.length > 0 && totalDeleted < MAX_FILE_PROCESS_DELETE) {
        deleteAndLog(batchBuffer);
        totalDeleted += batchBuffer.length;
    }

    Logger.log(`完了: ${totalDeleted}件 を削除しました。`);
    // SpreadsheetApp.getUi().alert(`完了: ${totalDeleted}件 を削除しました。`);
}

/**
 * (新規) スケジュールトリガーから呼び出す用: 一覧取得を自動実行
 * ・fetchTargetFilesAndWriteLogInChunks() をそのまま呼ぶだけ
 */
function scheduledFetchFiles(): void {
    // 追加のチェックを入れたい場合（例: すでに何か十分なログがあるかどうか）などはここで実装可。
    fetchTargetFilesAndWriteLogInChunks();
}

/**
 * (新規) スケジュールトリガーから呼び出す用: 削除を自動実行
 * ・deleteFilesFromLogInChunks() を呼ぶ
 * ・リスクがあるため、最終的な判断は慎重に
 */
function scheduledDeleteFiles(): void {
    // 例: "本当に削除していいか" フラグをConfigシートで確認する 等のチェックを入れてもOK
    deleteFilesFromLogInChunks();
}


/**
 * ファイルをまとめて削除し、削除日時をLogシートに書き込む
 */
function deleteAndLog(rows: LogRow[]): void {
    const now = new Date();
    rows.forEach(row => {
        try {
            const file = DriveApp.getFileById(row.fileId);
            file.setTrashed(true);
            updateDeletedAt(row.rowIndex, now);
        } catch (e) {
            Logger.log(`削除エラー: fileId=${row.fileId} => ${e}`);
        }
    });
}

