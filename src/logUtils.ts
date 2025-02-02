/**
 * logUtils.ts
 *
 * 「ファイル一覧ログシート」に対する読み書き処理をまとめる。
 *  - 初回(1回目)でファイル情報を書き込む
 *  - 2回目で削除を行うとき、ログシートを読み込み
 */

// シート名
const LOG_SHEET_NAME = "FileLog";

// カラムの列番号 (1始まり)
// A: FileID, B:FileName, C:FileURL, D:Owner, E:Updated, F:Size, G:Skip/Comment, H:DeletedAt
const COL_FILE_ID = 1;
const COL_FILE_NAME = 2;
const COL_FILE_URL = 3;
const COL_OWNER = 4;
const COL_UPDATED = 5;
const COL_SIZE = 6;
const COL_SKIP_COMMENT = 7;
const COL_DELETED_AT = 8;

/**
 * Fileの配列をログシートに追記する。
 *
 * @param files  DriveApp.File[] (getTargetFilesの結果)
 */
function writeFilesToLogSheet(files: GoogleAppsScript.Drive.File[]): void {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sheet) {
        // シートが無ければ新規作成
        sheet = ss.insertSheet(LOG_SHEET_NAME);
        // 見出し行を入れておく(任意)
        sheet.appendRow(["File ID", "File Name", "File URL", "Owner", "Last Updated", "Size", "Skip/Comment", "Deleted At"]);
    }

    if (files.length === 0) {
        return;
    }

    const now = new Date();
    const data: Array<Array<any>> = [];

    files.forEach((file) => {
        const fileId = file.getId();
        const fileName = file.getName();
        const fileUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
        let owner = "";
        try {
            owner = file.getOwner().getEmail();
        } catch (e) {
            owner = "OwnerUnknown";
        }
        const updated = Utilities.formatDate(file.getLastUpdated(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
        const size = file.getSize();

        data.push([
            fileId,
            fileName,
            fileUrl,
            owner,
            updated,
            size,
            "",   // Skip/Commentは初期空
            "",   // DeletedAtは初期空
        ]);
    });

    // まとめて append
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
}

/**
 * まだ削除されていない行の情報を取得する
 *  (DeletedAt 列が空のもの)
 *
 * @returns {LogRow[]} 未削除の行の配列
 */
function getNotDeletedRows(): LogRow[] {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sheet) {
        return [];
    }

    // シートの最終行までを取得
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        // 見出し行しかないなど、データなし
        return [];
    }

    // A2:H(lastRow) まで取得
    const range = sheet.getRange(2, 1, lastRow - 1, 8);
    const values = range.getValues();

    const results: LogRow[] = [];
    values.forEach((row, idx) => {
        const rowIndex = 2 + idx; // シート上の行番号

        const fileId = row[COL_FILE_ID - 1] as string;
        const fileName = row[COL_FILE_NAME - 1] as string;
        const fileUrl = row[COL_FILE_URL - 1] as string;
        const ownerEmail = row[COL_OWNER - 1] as string;
        const updated = row[COL_UPDATED - 1] as string;
        const fileSize = row[COL_SIZE - 1] as number;
        const skipComment = row[COL_SKIP_COMMENT - 1] as string;
        const deletedAt = row[COL_DELETED_AT - 1] as string;

        if (!deletedAt) {
            // 削除日が空 => まだ削除されていない
            results.push({
                rowIndex,
                fileId,
                fileName,
                fileUrl,
                ownerEmail,
                updated,
                fileSize,
                skipComment,
                deletedAt: "",
            });
        }
    });

    return results;
}

/**
 * 指定行の DeletedAt 列に日付を書き込む
 *
 * @param rowIndex シート上の行番号
 * @param date     削除日時
 */
function updateDeletedAt(rowIndex: number, date: Date): void {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sheet) return;

    const dateStr = Utilities.formatDate(date, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rowIndex, COL_DELETED_AT).setValue(dateStr);
}

/**
 * ログシートの1行分データを表す型定義 (TypeScript)
 */
interface LogRow {
    rowIndex: number;    // シート上の行番号
    fileId: string;
    fileName: string;
    fileUrl: string;
    ownerEmail: string;
    updated: string;
    fileSize: number;
    skipComment: string; // 空なら削除OK, 何か書いてあれば削除しない
    deletedAt: string;   // 空なら未削除
}

/**
 * ログシートにすでに記載されているファイルIDをすべて返す
 */
function getAllLoggedFileIds(): string[] {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sheet) {
        return [];
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        // ヘッダのみ or シートが空
        return [];
    }

    // A列(File ID) を2行目から最終行まで取得
    // COL_FILE_ID = 1 と仮定
    const range = sheet.getRange(2, COL_FILE_ID, lastRow - 1, 1);
    const values = range.getValues(); // 2次元配列 [[fileId], [fileId], ...]

    // 1次元配列に変換
    return values.map(row => row[0].toString());
}