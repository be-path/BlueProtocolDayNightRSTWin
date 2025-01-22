# ブループロトコル風　昼夜ウィジェット（レグナス時間）

ブループロトコルの画面の左上に表示されている昼夜アイコンのウィジェットです。実際のレグナスの時間をデスクトップに表示します。
**こちらはブループロトコルの二次創作作品です。このウィジェットについて公式に問い合わせないようおねがいします。**

## ビルド・インストール方法

開発環境はすでに準備されているものとします。

### Windows

T.B.D.

### Mac

下記コマンドでビルドすると、 dist ディレクトリ配下に `BPDayNightRST-1.0.5-arm64.dmg` が生成されます。

```
$ cd /path/to/bpdaynightrst
$ npm run build
```

生成された dmg ファイルを Finder から実行し、アプリをインストールしてください。

### Linux (Ubuntu)

下記コマンドでビルドすると、 dist ディレクトリ配下に `bpdaynightrst_x.x.x_amd64.deb` が生成されます。

```
$ cd /path/to/bpdaynightrst
$ npm run build
```

生成された deb ファイルをインストールすることで、ウィジェットが使用可能になります。

```
$ sudo dpkg -i ./dist/bpdaynightrst_x.x.x_amd64.deb
```
