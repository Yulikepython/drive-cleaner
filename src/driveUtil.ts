/**
 * driveUtil.ts
 *
 * - getMatchingFileIterator:
 *   フォルダURLからフォルダを取得し、
 *   全ファイルのイテレーターと「ログに既存のFileIDセット」を返す
 *
 *   ここでは更新日などのフィルタは行わず、main.ts 側のループ内で isFileMatch() する。
 */

function getMatchingFileIterator(config: {
    folderUrl: string;
    // ... (targetYear, targetMonth, などもあるがここでは使わない)
}): {
    fileIterator: GoogleAppsScript.Drive.FileIterator,
    existingFileIds: Set<string>,
} {
    const { folderUrl } = config;

    const loggedIds = getAllLoggedFileIds();
    const existingFileIds = new Set<string>(loggedIds);

    const match = folderUrl.match(/[-\w]{25,}/);
    if (!match) {
        throw new Error("フォルダIDを取得できません。URLを確認してください。");
    }
    const folderId = match[0];
    const folder = DriveApp.getFolderById(folderId);

    // フォルダ内の全ファイルを返すイテレーター (ここで検索クエリは使わない)
    const fileIterator = folder.getFiles();

    return { fileIterator, existingFileIds };
}


/**
 * isFileMatch:
 *  Driveファイルが Config の条件(更新年月, サイズ, オーナー)を満たすか判定する
 *
 * @param file   GoogleAppsScript.Drive.File
 * @param config readConfigFromSheet() の戻り値
 * @returns boolean (true=マッチ, false=対象外)
 */
function isFileMatch(
    file: GoogleAppsScript.Drive.File,
    config: {
        targetYear: number | null;
        targetMonth: number | null;
        minSize: number | null;
        ownerEmail: string;
    }
): boolean {
    // 1) 更新日判定( targetYear-month 以前(含む) かどうか )
    if (config.targetYear !== null && config.targetMonth !== null) {
        const updated = file.getLastUpdated();
        const y = updated.getFullYear();
        const m = updated.getMonth() + 1;
        // ( y < targetYear ) or ( y==targetYear && m <= targetMonth )
        if (y < config.targetYear) {
            // OK
        } else if (y === config.targetYear) {
            if (m <= config.targetMonth) {
                // OK
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // 2) ファイルサイズ(minSize 以上)
    if (config.minSize !== null) {
        if (file.getSize() < config.minSize) {
            return false;
        }
    }

    // 3) オーナー一致
    if (config.ownerEmail) {
        try {
            const ownerMail = file.getOwner().getEmail();
            if (ownerMail !== config.ownerEmail) {
                return false;
            }
        } catch (e) {
            // 共有ドライブなど getOwner() 不可の場合は対象外にする
            return false;
        }
    }

    // 全条件パス
    return true;
}
