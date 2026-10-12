# 端末間同期を有効にする最短手順

設定前も、IndexedDBへの保存・学習管理・JSONバックアップは利用できます。「ローカルモード・Firebase未設定」と表示され、この状態を同期済みとは扱いません。

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成し、無料の **Spark** プランを維持します。請求先・クレジットカード・Blazeへの変更は不要です。
2. ウェブアプリを登録し、表示された公開設定値を `.env.example` に対応する `VITE_FIREBASE_*` 変数に設定します。ローカルでは `.env.local`、GitHub Pagesではリポジトリの **Settings → Secrets and variables → Actions → Variables** を利用します。サービスアカウント鍵は設定しません。
3. Authentication → Sign-in method → Google を有効にします。Authentication → Settings → Authorized domains に `totoro0419.github.io` を追加します。ローカル開発も使う場合は `localhost` も明示的に登録してください。
4. Firestore Database → Create database から **Standard edition / Native mode** のデータベースを作成し、`firestore.rules` の内容を Rules に貼り付けて公開します。テストモードの公開ルールは使用しません。
5. Pagesのデプロイワークフローを再実行して、アプリのマイライブラリ → 設定からGoogleログインします。別端末でも同じGoogleアカウントでログインします。

## 保存と競合の動作

- 操作を先にIndexedDBへ確定し、変更キューも同じtransactionで保存します。保存エラーは画面に表示され、保存成功とは扱いません。
- 再生位置などは30秒の送信窓で動画ごとにまとめます。オフラインのキューは再読み込み後も維持され、オンライン復帰・手動再試行・画面を隠す際に送信します。
- Firestoreは動画ごとのtransactionとrevisionで更新します。変更していないフィールドを上書きせず、同じフィールドはサーバーでcommitした順序を使います。端末時刻で勝者を決めません。
- メモは各変更を版として保持します。同時編集の両方を履歴から読めるようにし、単一のメモだけに潰しません。
- 未ログイン中の記録はログイン時にそのアカウントへ移します。以降の記録・未送信キューはアカウントごとに分離され、別アカウントに送信されません。ログアウト時はクラウド監視を解除します。
- JSONの復元は既存の変更済みフィールドを維持し、足りない記録とメモ履歴を追加します。バックアップの古い値による上書きを防ぎます。

無料枠の上限に達した場合は同期が止まり、端末内の保存は続きます。Sparkのままでは自動で有料プランへ変更されません。同期状態がエラーの場合はJSONバックアップを保存できます。認証・実際の端末間同期は利用者のFirebase設定後に確認が必要です。

公式資料：[Googleログイン](https://firebase.google.com/docs/auth/web/google-signin)、[Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)、[UIDごとのSecurity Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)、[Firebaseプラン](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)。
