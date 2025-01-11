import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, shell  } from "electron";
import Store from "electron-store";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import packageJson from "./package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let tray;
let isAlwaysOnTop = true; // 初期状態: 最前面表示

const store = new Store();

const TIMEOUT_WINDOW_BACKGROUND = 2000;
const TIMEOUT_DEBOUNCE = 500;

const COLOR_TRANSPARENT = "#00000000";
const COLOR_WINDOW_MOVING = "#11FFFFFF";

const LABEL_ALWAYS_ON_TOP_ON = "最前面：OFF - <ON>";
const LABEL_ALWAYS_ON_TOP_OFF = "最前面：<OFF> - ON";
const LABEL_UPDATE_INFO = "アップデート情報";
const LABEL_ABOUT = "作成元情報";
const LABEL_EXIT = "終了";
const LABEL_OK = "OK";
const TEXT_BP_COPYRIGHT = "BLUE PROTOCOL ©2019 Bandai Namco Online Inc. ©2019 Bandai Namco Studios Inc.";

const MEDIA_ICON_TRAY_DEFAULT = "day.png";

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		const context = this;
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(context, args), wait);
	};
}

app.on("ready", async () => {
	const exePath = app.getPath("exe");

	// 開発環境ではスタートアップ登録をスキップ
	if (!exePath.includes("electron.exe")) {
		// スタートアップに登録
		app.setLoginItemSettings({
			openAtLogin: true,
			path: exePath, // ビルド済みアプリの実行ファイル
		});
	}

	const windowBounds = store.get("windowBounds", {
		width: 200,
		height: 200,
		x: undefined,
		y: undefined
	});
	isAlwaysOnTop = store.get("windowAlwaysOnTop", isAlwaysOnTop);

	mainWindow = new BrowserWindow({
		width: windowBounds.width,
		height: windowBounds.height,
		x: windowBounds.x,
		y: windowBounds.y,
		frame: false,
		transparent: true,
		skipTaskbar: true,
		alwaysOnTop: isAlwaysOnTop,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			devTools: false,
		},
	});

	mainWindow.loadFile("index.html");

	// デバウンス付きの保存処理
	const saveBounds = debounce(() => {
		const bounds = mainWindow.getBounds();
		store.set("windowBounds", bounds);
	}, TIMEOUT_DEBOUNCE);

	let resizeTimeout;
	function showWindowBackground() {
		mainWindow.setBackgroundColor(COLOR_WINDOW_MOVING);

		// 一定時間経過後に透明に戻す
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			mainWindow.setBackgroundColor(COLOR_TRANSPARENT);
		}, TIMEOUT_WINDOW_BACKGROUND);
	}

	mainWindow.on("move", () => {
		showWindowBackground();
		saveBounds();
	});

	mainWindow.on("resize", () => {
		showWindowBackground();
		saveBounds();
	});

	mainWindow.show();
	
	const updateContextMenu = () => {
		const contextMenu = Menu.buildFromTemplate([
			{
				label: isAlwaysOnTop ? LABEL_ALWAYS_ON_TOP_ON : LABEL_ALWAYS_ON_TOP_OFF,
				click: () => {
					isAlwaysOnTop = !isAlwaysOnTop;
					mainWindow.setAlwaysOnTop(isAlwaysOnTop);
					store.set("windowAlwaysOnTop", isAlwaysOnTop);
					updateContextMenu();
				},
			}, {
				type: "separator"
			}, {
				label: LABEL_UPDATE_INFO,
				click: () => {
					shell.openExternal(packageJson.homepage);
				},
			}, {
				label: LABEL_ABOUT,
				click: () => {
					dialog.showMessageBox({
						type: "info",
						title: LABEL_ABOUT,
						message: packageJson.message,
						detail: `${packageJson.longName} ver. ${packageJson.version}\n作者：${packageJson.author} X${packageJson.twitter}\n${TEXT_BP_COPYRIGHT}`,
						buttons: [LABEL_OK],
					});
				},
			}, {
				label: LABEL_EXIT,
				click: () => {
					app.quit();
				},
			},
		]);
		tray.setContextMenu(contextMenu);
	};

	const iconPath = join(__dirname, "media", MEDIA_ICON_TRAY_DEFAULT);
	tray = new Tray(iconPath);
	tray.setToolTip(packageJson.shortName);
	updateContextMenu()

	ipcMain.on("update-tray-icon", (event, imageData) => {
		const trayIcon = nativeImage.createFromDataURL(imageData);
		tray.setImage(trayIcon);
	});
});
