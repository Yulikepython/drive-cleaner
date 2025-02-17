# drive-cleaner

Google スプレッドシートにバインドされた GAS (Google Apps Script) プロジェクトです。  
Drive 上のファイルを「条件に応じて検索 → ログに書き出し → ログを参照して削除」という2ステップ運用を想定したサンプルを含みます。

---

## 機能概要

1. **ファイル取得＆ログ書き出し**
    - Configシートに設定した条件（フォルダURL、指定月(YYYY-MM) 以前、ファイルサイズ、オーナー等）をもとに Drive 上のファイルを検索
    - 結果を FileLog シートに書き込み
        - すでにログにあるファイルは二重登録しません
    - **チャンク処理**により、1回の実行で大量ファイルをすべて処理するのではなく、**一定件数ずつログへ書き込む**ことでタイムアウトを回避しています (初期では `CHUNK_SIZE_FETCH=200`、`MAX_FILE_PROCESS_FETCH=2000` などを設定)

2. **ログを参照して削除**
    - FileLog シートに書き出されたファイルのうち、**まだ削除されていない**(DeletedAtが空) & **Skip/Commentが空**のものだけ削除対象
    - 削除すると同時に削除日時を記録するため、再実行時に重複削除されません
    - こちらも**チャンク処理**を利用しており、1回の実行で200件ずつ削除 → 多すぎる場合は実行を複数回に分割
    - 誤って削除した場合でも [Googleドライブのゴミ箱](https://drive.google.com/drive/trash) にある場合は復元できますが、**完全に削除してしまうと戻せません**。くれぐれもご注意ください。

---

## ご利用上の注意 (重要)

1. **削除前に必ずログを確認**
    - 本プロジェクトは「**誤って削除**」してしまった場合の責任を**一切負いません**。
    - 本番運用前にテストし、ログ(FileLog)を十分確認してから削除機能を実行してください。

2. **タイムアウトエラーについて**
    - ファイル数・ファイルサイズが多い場合、1回のGAS実行が6分などで制限されタイムアウトになる可能性があります。
    - コード内では**チャンクサイズや最大処理数**を調整し、1回に処理する件数を制限しています。必要に応じて以下変数を修正してください。
        - `MAX_FILE_PROCESS_FETCH`, `CHUNK_SIZE_FETCH` (ファイル取得の上限 / 1回の書き込み件数)
        - `MAX_FILE_PROCESS_DELETE`, `CHUNK_SIZE_DELETE` (削除の上限 / 1回の削除件数)

3. **自己責任でご利用ください**
    - このスクリプトを実行したことによる損害、誤削除、不具合など、リポジトリ提供者は**一切責任を負いません**。
    - 利用者各自の責任においてご利用ください。

---

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone https://github.com/Yulikepython/drive-cleaner.git
cd drive-cleaner
```

### 2. 依存パッケージのインストール

```bash
npm install
```

> `@types/google-apps-script` など、TypeScript で GAS開発するための型定義が含まれます。

### 3. スプレッドシートバインド型の GAS プロジェクトを作成

```bash
clasp create --type sheets --rootDir src --title "drive-cleaner"
```

これにより、`src/.clasp.json` が生成されます。  
必要に応じて `.clasp.json` をプロジェクト直下に移動し、 `"rootDir": "src"` が設定されていることを確認してください。

**clasp についてよく分からない場合**
 - [公式ドキュメント](https://github.com/google/clasp) や
 - **こちらの日本語記事**「[【実例コード付】claspとvscodeでGAS開発](https://itc.tokyo/gas/clasp/)」

を参考に学習すると便利です。

### 4. ビルド & プッシュ

```bash
npm run build
npm run push
```

- `npm run build` : TypeScript をコンパイルし、JSや `.gs` を生成
- `npm run push` : `clasp push` でGASへアップロード

### 5. スプレッドシートを確認

```bash
npm run open
```

- バインド先のGASプロジェクトがブラウザで開きます。スプレッドシート本体もDriveから開いてください。

**サンプルとして参照できるシート**
- [こちらのサンプルスプレッドシート](https://docs.google.com/spreadsheets/d/1UWmvjVmWDS58idpJvzUy9PpdYSwgeKf3U0TAnAD6dUg/view?gid=0#gid=0)  
  （閲覧のみ権限）
    - 実際の運用では自分専用のシートを作り、同じように「Configシート」「FileLogシート」を用意してください。

### 6. シート構成

- **Configシート**
    - `B2`: フォルダURL
    - `C2`: ターゲット年月 (yyyy-MM)
      > **必ず「書式なしテキスト」に設定**してください。  
      > セルが日付書式になっていると、意図せず `2024-12` が `12/1/2024` などに変換され、**すべてのファイルが対象**になってしまう場合があります。
    - `D2`: 最小ファイルサイズ (バイト)
    - `E2`: オーナーのメールアドレス

- **FileLog シート**
    - ファイル検索結果・削除後の履歴を記録
    - 初回実行時に自動作成される

- **作業用シート（任意）**
    - ボタン（画像や図形を配置し、スクリプトにリンクさせる）を設置して、  
      手動で **一覧取得** や **削除** 関数を呼び出せるようにするなど、  
      運用スタイルに応じて自由に追加してください。
    - 画面を見ながらステップ実行できるため、誤削除を防ぐうえで便利です。

---

### 参考: デプロイ (Webアプリとしてバージョン管理する場合のみ)
```bash
npm run deploy
```

- これにより、clasp で新しいバージョンが作成されます。
- WebアプリURLが必要な場合や、バージョン管理したい場合に使用してください。

## 7. 実行ステップ

1. **`fetchTargetFilesAndWriteLogInChunks`**
    - Configを読み取り、Driveからファイルを検索し、FileLogに追記する
    - チャンク処理の都合上、1回に書き込む最大数に達すると途中で打ち切ります（再実行すると続きを取ってこれます）。
    - ログができたら、**「Skip/Comment」列に何か書いた行は削除されない**ようになります。

2. **`deleteFilesFromLogInChunks`**
    - FileLogシートのうち、`DeletedAt`が空(未削除) かつ `Skip/Comment`が空の行だけ削除し、`DeletedAt`に日付をセット
    - こちらもチャンク処理のため、1回の実行で指定数を超えた場合は再度実行が必要です。

---

## 自動実行 (スケジュールトリガー) について

本プロジェクトはボタン実行や手動実行に加え、GASの**時間主導型トリガー**（例えば毎日深夜3時など）を設定することで**自動実行**が可能です。

### 1. 一覧取得の自動実行

- `scheduledFetchFiles()`
    - `main.ts` に用意された関数です。
    - Configシートの条件をもとに定期的にDriveを検索し、FileLog シートへ対象ファイルを追記します。
    - ファイルが多い場合でもチャンク処理されますが、あまりに頻繁に実行しても「ほぼ同じログ」が溜まり続けるだけですのでご注意ください。

### 2. 削除の自動実行 (リスクあり)

- `scheduledDeleteFiles()`
    - FileLog シート内の「未削除 & Skip/Commentが空」なファイルを自動削除します。
    - **注意**:
        1. **誤削除のリスク**
            - 人手で「削除したくないファイル」の Skip/Comment 列に記入しておかなければ、誤って削除される可能性があります。
            - 自動実行はログ確認のステップをスキップしてしまうため、**本当に不要なファイルか**を見逃してしまうかもしれません。
        2. **ログを確認しないまま削除される**
            - 誤った条件設定や想定外のファイルが対象になる場合、気づかないうちに削除してしまうリスクがあります。
        3. **ゴミ箱への移動**
            - 削除後、Google ドライブのゴミ箱に入るファイルは復元できる場合がありますが、一定期間後に完全削除されます。

#### 自動削除を導入するかどうか

- **強く推奨**: まずは手動(ボタン)実行で動作を確認し、ログを見て安心できる運用が整ってから自動化する。
- **定期自動削除を行う場合**: 事前にFileLogを確認するフローや、**さらに条件を厳しくする**などの対策を検討してください。
- **責任**: 本スクリプトを用いた誤削除などについて、リポジトリ提供者は一切の責任を負いません。自己責任で運用をお願いいたします。

### 3. トリガーの設定方法

1. GASエディタ(スクリプト画面)を開く
2. 左メニューの「トリガー」 → 「トリガーを設定」
3. `scheduledFetchFiles` や `scheduledDeleteFiles` を対象に、**時間ベースのトリガー** (例: 午前3時に1日1回) を追加
4. 保存し、必要に応じて権限承認を行う

---

## 注意事項まとめ

- 一度スケジュールトリガーを設定すると、**自動的に削除**が走ります。
- 誤削除・想定外の削除が起きないよう、**Skip/Comment列**への記入や**Configシートの条件**確認を徹底してください。
- 利用者自身の責任で設定し、運用してください。

---

## チャンク処理について

- 本コードでは、GAS実行の**時間制限**を回避するため、**一度に大量のファイルを処理しない**ように設計しています。
- `CHUNK_SIZE_FETCH` (一度に書き込む件数)、`MAX_FILE_PROCESS_FETCH` (1回の実行で処理する上限) などを指定し、何千・何万件といったファイル数でも複数回実行すれば完了させられます。
- 削除処理も同様に `CHUNK_SIZE_DELETE`, `MAX_FILE_PROCESS_DELETE` で管理します。
- 要件やファイル数に応じて、数値を適宜調整してください（小さすぎると実行回数が増えますがタイムアウトリスクは減ります。大きすぎると1回で処理しきれずタイムアウトが発生しやすくなります）。

---

## 開発時のよく使うコマンド

- `npm run build` : TypeScript コンパイル
- `npm run push` : スクリプトをGASに反映
- `npm run open` : GASプロジェクトをブラウザで開く (`clasp open`)
- `npm run watch` : ソース変更を監視して自動ビルド

---

## ライセンス / 免責事項

- 本コードはサンプルとして提供されます。
- **利用者自身の責任**でご利用ください。
- 削除によるデータ消失やタイムアウト、その他のトラブルについて、**リポジトリ提供者は一切責任を負いません**。
- ご自身で十分テストを行い、誤削除・想定外の削除を防ぐようご注意ください。
- 削除後はゴミ箱にファイルが入っているかどうかをチェックすることも推奨します。
- **本プロジェクトの詳細な利用規約・免責事項については [TERMS_OF_USE.md](./TERMS_OF_USE.md) をご確認ください。**万が一、両文書に記載の内容に矛盾や食い違いがある場合は、**TERMS_OF_USE.md が優先**されるものとします。
