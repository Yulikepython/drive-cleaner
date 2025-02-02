/**
 * config.ts
 *
 * Configシートから条件を読み取るための機能をまとめる。
 * 例) シート名, セル位置, 読み取り関数など。
 */

// スプレッドシート名やセル位置
const CONFIG_SHEET_NAME = "Config";

// 以下セル: B2=URL, C2=YYYY-MM, D2=MinSize, E2=OwnerEmail
const CELL_FOLDER_URL = "B2";
const CELL_YEAR_MONTH = "C2";
const CELL_MIN_SIZE   = "D2";
const CELL_OWNER      = "E2";

/**
 * Configシートの情報を読み取り返す
 */
function readConfigFromSheet(): {
    folderUrl: string;
    yearMonth: string | null;
    minSize: number | null;
    ownerEmail: string;
} {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!configSheet) {
        throw new Error(`シート「${CONFIG_SHEET_NAME}」が見つかりません。`);
    }

    // セルから値を取得
    const folderUrl = configSheet.getRange(CELL_FOLDER_URL).getValue().toString().trim();
    const ym = configSheet.getRange(CELL_YEAR_MONTH).getValue().toString().trim();
    const sizeStr = configSheet.getRange(CELL_MIN_SIZE).getValue().toString().trim();
    const owner = configSheet.getRange(CELL_OWNER).getValue().toString().trim();

    // 型変換
    const yearMonth = ym ? ym : null;
    const minSize = sizeStr ? parseInt(sizeStr, 10) : null;

    return {
        folderUrl,
        yearMonth,
        minSize,
        ownerEmail: owner,
    };
}
