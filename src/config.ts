/**
 * config.ts
 *
 * Configシートから条件を読み取るための機能をまとめる。
 */

// スプレッドシート名やセル位置
const CONFIG_SHEET_NAME = "Config";
// B2=URL, C2=YYYY-MM, D2=MinSize, E2=OwnerEmail
const CELL_FOLDER_URL = "B2";
const CELL_YEAR_MONTH = "C2";
const CELL_MIN_SIZE   = "D2";
const CELL_OWNER      = "E2";

/**
 * Configシートの情報を読み取り返す
 *   - folderUrl: フォルダURL
 *   - targetYear, targetMonth: "yyyy-MM" (これ以前(含む)を対象とする)
 *   - minSize: バイト単位。このサイズ以上を対象
 *   - ownerEmail: オーナー一致のみ対象
 */
function readConfigFromSheet(): {
    folderUrl: string;
    targetYear: number | null;
    targetMonth: number | null;
    minSize: number | null;
    ownerEmail: string;
} {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!configSheet) {
        throw new Error(`シート「${CONFIG_SHEET_NAME}」が見つかりません。`);
    }

    const folderUrl = configSheet.getRange(CELL_FOLDER_URL).getValue().toString().trim();
    const ym = configSheet.getRange(CELL_YEAR_MONTH).getValue().toString().trim();
    const sizeStr = configSheet.getRange(CELL_MIN_SIZE).getValue().toString().trim();
    const owner = configSheet.getRange(CELL_OWNER).getValue().toString().trim();

    let targetYear: number | null = null;
    let targetMonth: number | null = null;
    if (ym) {
        const [y, m] = ym.split("-");
        if (y && m) {
            targetYear = parseInt(y, 10);
            targetMonth = parseInt(m, 10); // 1-12
        }
    }

    const minSize = sizeStr ? parseInt(sizeStr, 10) : null;

    return {
        folderUrl,
        targetYear,
        targetMonth,
        minSize,
        ownerEmail: owner,
    };
}
