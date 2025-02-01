/**
 * 指定フォルダ内のファイルを、以下の条件に合致した場合のみ削除(ゴミ箱移動)する例
 *   - TARGET_LAST_UPDATED_ON_OR_BEFORE_YYYYMM: この年月(yyyy-MM)以前(含む)に更新されたファイル
 *   - TARGET_MIN_FILE_SIZE: このサイズ(Byte)以上のファイル
 *   - TARGET_OWNER_EMAIL: ファイルのオーナーがこのメールアドレスである
 * 条件は AND で評価する（すべての指定条件を満たしたファイルのみ削除）。
 *
 * ※「以前(含む)」や「以上」などは変数名とコード上で分かるようにしています。
 */

function deleteFilesInFolder(): void {
    // スクリプトプロパティから値を取得
    const scriptProperties = PropertiesService.getScriptProperties();
    const targetFolderUrl =
        scriptProperties.getProperty("TARGET_FOLDER_URL") || "";
    const targetYearMonth =
        scriptProperties.getProperty("TARGET_LAST_UPDATED_ON_OR_BEFORE_YYYYMM"); // "2025-01" etc.
    const targetMinFileSizeStr =
        scriptProperties.getProperty("TARGET_MIN_FILE_SIZE"); // "1048576" etc.
    const targetOwnerEmail =
        scriptProperties.getProperty("TARGET_OWNER_EMAIL"); // "example@example.com"

    if (!targetFolderUrl) {
        Logger.log("TARGET_FOLDER_URL が未設定です。");
        return;
    }

    // URL からフォルダIDを抽出
    const folderIdMatch = targetFolderUrl.match(/[-\w]{25,}/);
    if (!folderIdMatch) {
        Logger.log("フォルダIDを抽出できませんでした。URLを確認してください。");
        return;
    }
    const folderId = folderIdMatch[0];
    const folder = DriveApp.getFolderById(folderId);

    // 「yyyy-MM」(例: "2025-01") を年と月に分割
    let deleteBeforeYear: number | null = null;
    let deleteBeforeMonth: number | null = null;
    if (targetYearMonth) {
        const [yearStr, monthStr] = targetYearMonth.split("-");
        if (yearStr && monthStr) {
            deleteBeforeYear = parseInt(yearStr, 10);
            deleteBeforeMonth = parseInt(monthStr, 10); // 1～12
        }
    }

    // ファイルサイズのしきい値
    const targetMinFileSize = targetMinFileSizeStr
        ? parseInt(targetMinFileSizeStr, 10)
        : null;

    // フォルダ内のファイルを順番にチェック
    const files = folder.getFiles();
    let totalCount = 0;
    let deleteCount = 0;

    while (files.hasNext()) {
        const file = files.next();
        totalCount++;

        let shouldDelete = true; // 条件判定用

        // --- A) 最終更新日が指定年月以前(含む)かどうか ---
        //     (targetYearMonth がない場合はスキップ扱い)
        if (deleteBeforeYear !== null && deleteBeforeMonth !== null) {
            const updatedDate = file.getLastUpdated();
            const year = updatedDate.getFullYear();
            const month = updatedDate.getMonth() + 1; // 0-11 -> 1-12

            // 「年が小さい」または「同じ年でかつ月が deleteBeforeMonth 以下」であればOK
            // それ以外なら対象外
            if (year < deleteBeforeYear) {
                // OK
            } else if (year === deleteBeforeYear) {
                if (month <= deleteBeforeMonth) {
                    // OK
                } else {
                    shouldDelete = false;
                }
            } else {
                shouldDelete = false;
            }
        }

        // --- B) ファイルサイズがしきい値以上かどうか ---
        if (targetMinFileSize !== null) {
            const fileSize = file.getSize();
            if (fileSize < targetMinFileSize) {
                shouldDelete = false;
            }
        }

        // --- C) オーナーのメールアドレスが一致するか ---
        if (targetOwnerEmail) {
            // 共有ドライブなどでオーナーが取れない場合があるため、状況に応じて対策してください
            const ownerEmail = file.getOwner().getEmail();
            if (ownerEmail !== targetOwnerEmail) {
                shouldDelete = false;
            }
        }

        // 全ての条件を満たした場合のみ削除
        if (shouldDelete) {
            file.setTrashed(true);
            deleteCount++;
        }
    }

    Logger.log(
        `処理完了。対象フォルダ内ファイル数: ${totalCount} / 削除(ゴミ箱へ移動)した数: ${deleteCount}`
    );
}
