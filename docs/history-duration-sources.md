# 日本史の旧補完データ（元ID未検証）

2026-10-14の再監査で、最初の10授業の保存値は同名のBilibili転載動画の時間に基づき、元YouTube動画IDの正式全長との同一性を確認できていないことが判明した。

元の秒数は証拠として `src/data/history-duration-supplement.json` に保持し、単一の `video-durations.json` に安全移行した。実行時に補完ファイルを読み込まない。今回新規取得・正式検証した値とは数えず、状態インデックスで未検証と表示する。

旧出典: https://www.bilibili.com/video/BV1gs411J7E1/ 、https://digitalcreators.jp/channel/UCzSU4Vjk2VBJFHPvB5SJxHA/ 。タイトル一致や授業番号一致だけで元IDの時間を確定しない。

詳細は [全動画監査](VIDEO_DURATION_COVERAGE_REPORT.md) を参照。
