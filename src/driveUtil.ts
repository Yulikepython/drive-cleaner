/**
 * driveUtils.ts
 *
 * Drive からファイル一覧を取得するための共通ルーチンをまとめる
 */

/**
 * 条件に合うファイルリストをDriveから検索して返す。
 *   @param folderUrl  対象フォルダURL
 *   @param yearMonth  "yyyy-MM" (これ以前に更新されたもの)
 *   @param minSize    バイト単位。このサイズ以上
 *   @param ownerEmail オーナーが一致するファイルのみ
 */
function getTargetFiles(
    folderUrl: string,
    yearMonth: string | null,
    minSize: number | null,
    ownerEmail: string
): GoogleAppsScript.Drive.File[] {
    if (!folderUrl) {
        return [];
    }
    // URLからフォルダIDを抽出
    const folderIdMatch = folderUrl.match(/[-\w]{25,}/);
    if (!folderIdMatch) {
        Logger.log("フォルダIDをURLから取得できません。");
        return [];
    }
    const folderId = folderIdMatch[0];

    // フォルダオブジェクト
    const folder = DriveApp.getFolderById(folderId);

    // 年月(yyyy-MM)を解析 -> それ以前(含む)か判定用
    let targetYear: number | null = null;
    let targetMonth: number | null = null;
    if (yearMonth) {
        const [y, m] = yearMonth.split("-");
        if (y && m) {
            targetYear = parseInt(y, 10);
            targetMonth = parseInt(m, 10); // 1-12
        }
    }

    const filesIt = folder.getFiles();
    const result: GoogleAppsScript.Drive.File[] = [];

    while (filesIt.hasNext()) {
        const file = filesIt.next();
        let match = true;

        // A) 年月(yyyy-MM) 以前か
        if (targetYear !== null && targetMonth !== null) {
            const upd = file.getLastUpdated();
            const y = upd.getFullYear();
            const mo = upd.getMonth() + 1;
            // y < targetYear or (y==targetYear && mo<=targetMonth)
            if (y < targetYear) {
                // OK
            } else if (y === targetYear) {
                if (mo <= targetMonth) {
                    // OK
                } else {
                    match = false;
                }
            } else {
                match = false;
            }
        }

        // B) ファイルサイズが minSize 以上
        if (minSize !== null && file.getSize() < minSize) {
            match = false;
        }

        // C) オーナーが一致
        if (ownerEmail) {
            try {
                const mail = file.getOwner().getEmail();
                if (mail !== ownerEmail) {
                    match = false;
                }
            } catch (e) {
                // 共有ドライブ等オーナー取れない → 合致しない扱い
                match = false;
            }
        }

        if (match) {
            result.push(file);
        }
    }

    return result;
}
