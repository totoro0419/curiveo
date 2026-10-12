# Curiveo

厳選された教育動画をチャンネル・シリーズ中心に整理する、個人学習用のWebアプリ。

**公開先:** https://totoro0419.github.io/curiveo/

## 利用できる機能

- ホームから学習再開。教科 → チャンネル・講座 → 講座内の単元目次 → 授業。公式順を保ち、チャンネルを混ぜずに学習
- 単元階層・横断検索で直接ジャンプ。単元からも講座を選択して授業を表示。パンくず、戻る、一覧の表示件数・選択状態・スクロール復元
- 短い方向付き画面遷移、アイコンの共有遷移、ばねの押下応答、目次開閉、タブ、進捗・登録状態のモーション。OSの動きを減らす設定に対応
- 正式ロゴ、シンボル単独の通常/Maskableアイコン、起動直後からのインストール案内、保存完了後の明示的PWA更新、上端Pull-to-Refresh抑止
- 公式YouTube IFrame API、映像外の再生・一時停止・±10秒・シーク・速度・音量・全画面、前後の授業
- 再生位置・履歴の自動保存、お気に入り、後で見る、手動の学習完了、理解度、復習、メモ
- 動画IDによる重複排除、教科・講座の進捗、情報Ⅰの公式単元目次へジャンプ
- IndexedDBへの端末内保存、JSONバックアップ・復元、メモの別版保全
- 任意のGoogleログイン・Firestore同期（Firebase設定後）。通信を待たず端末に保存
- PC・タブレット・スマホ用UI、PWA、オフライン時のアプリ・カタログ・記録閲覧

動画のオフライン保存は行いません。ストリーミングには通信が必要です。YouTube側の表示・公式リンクを隠しません。

## 収録

2026-10-12時点、**2,276本 / 114講座**。数学1,054、英語160、化学165、物理123、国語361、日本史200、世界史200、情報Ⅰ13。

- 数学の基礎カタログ1,022本はMathveo `737bf37a41fc373aa2417e2aa50013199065f6f5` から選択流用。Mathveo本体は変更していません。
- ただよび物理101講（力学43・熱10・波13・電磁気28・原子7）、ヨビノリ高校物理22本
- せかチャン情報Ⅰ13本。長尺講義内の公式単元目次153項目を保持
- 超わかる英語90・化学165、ムンディ日本史200・世界史200、ただよび国語361
- PASSLABO80本、Stardy22本。PASSLABO「全パターン解説」とStardy「完全網羅シリーズ」「軌跡・領域【高校数学全パターン化】」を区別

公式目次・公開プレイリストの動画ID、授業順、タイトル、投稿元に基づく収録です。単元分類は公式目次・正式タイトルからの整理で、全動画の内容精査・個別再生検査・現行課程適合は行っていません。未確認の時間・課程年度は創作せず、null/unverifiedとして保持。数学には旧課程表記を含み、Mathveoの現行科目への対応を保持しています。

ただよび「現代文 設問別アプローチⅠ」は公開ページ表示10本のうち5本を取得。未取得5本を収録済みとは表示しません。プレミアム講座を除外しています。日本史44本は公式目次掲載の「Historia Mundi 2」の投稿で、投稿元を保持しています。

## 開発・公開

```sh
npm ci
npm run dev
npm run build
```

`npm run build` はTypeScriptとカタログ参照の検査後、静的ファイルとService Workerを生成します。`main`へのpushでGitHub PagesのActionsが動きます。初回のPages有効化をActionsで試みます。権限によって自動有効化できない場合のみ、Settings → Pages → SourceをGitHub Actionsに設定し、ワークフローを再実行してください。

### Firebase同期

未設定時はローカルモードで利用できます。[最短のFirebase設定手順](docs/firebase-setup.md)と`.env.example`を参照。無料Sparkプラン、Google AuthenticationとFirestoreのみを利用します。サーバー・Cloud Functions・有料サービス・クレジットカードは必須にしません。管理者秘密鍵をリポジトリに登録しないでください。

### カタログの再構築

確認済み収録元は `data/source-catalogs/`、統合済みカタログは `src/data/catalog.json`。収録元の修正後、指定コミットのMathveoを参照用にチェックアウトし、次を実行します。

```sh
node scripts/import-catalog.mjs ../mathveo-reference
npm run catalog:validate
```

Video IDを正規キーに統合し、単元と講座の複数所属を参照で保持します。講座別の公式順を優先し、進捗は固有動画数を基準に集計します。出典・未収録部分はデータ中に保持。動画は採用対象の講座だけを収録し、チャンネル全体を自動採用しません。

## 主な公式出典

[超わかる数学](https://kouki-honda.jp/youtube_hs-math/) / [英語](https://kouki-honda.jp/youtube_hs-english/) / [ただよび物理](https://tadayobi.com/blog/butsuri/butsuri02/) / [ヨビノリ高校物理](https://yobinori.jp/video/phys-hs.html) / [せかチャン](https://sekachan.net/info1-basic/) / [ムンディ世界史](https://mundisensei.com/lesson-videos-world/) / [日本史](https://mundisensei.com/lesson-videos-japan/)

個々の講座・動画には追加の公式出典URLを記録しています。

## UI・PWAの構成

表示用の分類は `src/navigation/hierarchy.ts`、講座内目次は `course-outline.ts`。動画ID・IndexedDBスキーマは変更せず、講座の元の授業順を保持します。分類は公式目次・既存単元・動画名が根拠で、未確定2本は「その他・分類確認中」に保持します。学習単元の探索は補助導線です。

モーションはCSSとWeb Animations APIを使用し、追加のライブラリはありません。押下のばねは減衰振動の標本、ページとアイコンはtransform/opacity中心。YouTube iframeの再生成条件は動画変更・再試行だけです。

PWAは版をそろえたローカルshellをキャッシュし、更新は明示操作で適用します。適用前に進行中の端末内保存・メモ・再生位置を待ち、失敗時には再読み込みしません。直前版のlazy chunkを保護し、IndexedDBには触れません。YouTubeやFirebaseをキャッシュしません。`overscroll-behavior-y: contain`をルートと内部縦スクロール領域に適用し、通常のtouchmoveは阻止しません。実Androidの挙動は別途確認が必要です。

正式ロゴの原本は `public/brand/curiveo-original.png`。シンボル/ワードマークは元画像を保持した派生素材で、アイコンは文字なし。再生成はPillowを利用して `python scripts/build-brand.py`（通常ビルドでは不要）。Maskable用の色付きシンボルは中心の安全円内に収めています。

最小検証と実機・外部設定の制限は [検証記録](docs/verification.md) を参照してください。
