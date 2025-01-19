import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, shell, screen } from "electron";
import Store from "electron-store";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import packageJson from "./package.json" with { type: "json" };

const IS_RELEASE = app.isPackaged;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let tray;
let isAlwaysOnTop = true; // 最前面表示
let isFixed = false; // ウィジェット固定（イベント透過）
let isHidden = false; // 隠す

const store = new Store();

const TIMEOUT_WINDOW_BACKGROUND = 2000;
const TIMEOUT_DEBOUNCE = 500;

const SIZE_DEFAULT = 200;

const COLOR_TRANSPARENT = "#00000000";
const COLOR_WINDOW_MOVING = "#11FFFFFF";

const LABEL_ALWAYS_ON_TOP = "最前面";
const LABEL_FIX = "固定";
const LABEL_HIDE = "隠す";
const LABEL_UPDATE_INFO = "アップデート情報";
const LABEL_ABOUT = "作成元情報";
const LABEL_EXIT = "終了";
const LABEL_OK = "OK";
const TEXT_BP_COPYRIGHT = "BLUE PROTOCOL - ©2019 Bandai Namco Online Inc. ©2019 Bandai Namco Studios Inc.";

const MEDIA_ICON_TRAY_DEFAULT = "day.png";

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		const context = this;
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(context, args), wait);
	};
}

// 画面外に出ないようにする
function adjustWindowPosition(window) {
	const bounds = window.getBounds(); // ウィンドウの位置とサイズを取得
	const display = screen.getDisplayMatching(bounds); // ウィンドウが存在するディスプレイを取得
	const workArea = display.workArea; // ディスプレイの作業領域

	let { x, y, width, height } = bounds;

	// ウィンドウが画面の左/右外に出ている場合
	if (x < workArea.x) x = workArea.x;
	if (x + width > workArea.x + workArea.width) x = workArea.x + workArea.width - width;

	// ウィンドウが画面の上/下外に出ている場合
	if (y < workArea.y) y = workArea.y;
	if (y + height > workArea.y + workArea.height) y = workArea.y + workArea.height - height;

	// 必要に応じて位置を更新
	if (x !== bounds.x || y !== bounds.y) {
		window.setBounds({ x, y, width, height });
	}
}

// 正方形を保つ
function forceSquare(window, newBounds, details) {
	switch(details.edge) {
		case "top":
		case "bottom":
			window.setBounds({
				x: newBounds.x,
				y: newBounds.y,
				width: newBounds.height,
				height: newBounds.height
			});
			break;
		
		case "left":
		case "right":
			window.setBounds({
				x: newBounds.x,
				y: newBounds.y,
				width: newBounds.width,
				height: newBounds.width,
			});
			break;
		default:
			window.setBounds({
				x: newBounds.x,
				y: newBounds.y,
				width: (newBounds.width + newBounds.height)/2,
				height: (newBounds.width + newBounds.height)/2,
			});
	}
}

function fixWindow(window, fix) {
	const className = fix ? "fixed" : "";
	window.setIgnoreMouseEvents(fix);
	window.webContents.executeJavaScript(`
		document.body.className = "${className}";
	`);
}

app.on("ready", () => {
	// リリース版の時にはスタートアップに登録
	if (IS_RELEASE) {
		app.setLoginItemSettings({
			openAtLogin: true,
			path: app.getPath("exe"), // ビルド済みアプリの実行ファイル
		});
	}

	const windowBounds = store.get("windowBounds", {
		width: SIZE_DEFAULT,
		height: SIZE_DEFAULT,
		x: undefined,
		y: undefined
	});
	isAlwaysOnTop = store.get("windowAlwaysOnTop", isAlwaysOnTop);
	isFixed = store.get("windowFixed", isFixed);
	isHidden = store.get("windowHidden", isHidden);

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
			devTools: !IS_RELEASE,
		},
	});

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

	mainWindow.on("moved", () => {
		adjustWindowPosition(mainWindow);
		showWindowBackground();
		saveBounds();
	});

	mainWindow.on("will-resize", (event, newBounds, details) => {
		event.preventDefault()
		forceSquare(mainWindow, newBounds, details);
		saveBounds();
	});

	mainWindow.on("resize", () => {
		adjustWindowPosition(mainWindow);
		showWindowBackground();
		saveBounds();
	});

	mainWindow.loadFile("index.html");
	if (isHidden) {
		mainWindow.hide();
	} else {
		mainWindow.show();
	}
	fixWindow(mainWindow, isFixed);
	
	const updateContextMenu = () => {
		const contextMenu = Menu.buildFromTemplate([
			{
				label: LABEL_ALWAYS_ON_TOP,
				type: "checkbox",
				checked: isAlwaysOnTop,
				click: () => {
					isAlwaysOnTop = !isAlwaysOnTop;
					mainWindow.setAlwaysOnTop(isAlwaysOnTop);
					store.set("windowAlwaysOnTop", isAlwaysOnTop);
				},
			}, {
				label: LABEL_FIX,
				type: "checkbox",
				checked: isFixed,
				click: () => {
					isFixed = !isFixed;
					fixWindow(mainWindow, isFixed);
					store.set("windowFixed", isFixed);
				},
			}, {
				label: LABEL_HIDE,
				type: "checkbox",
				checked: isHidden,
				click: () => {
					isHidden = !isHidden;
					if (isHidden) {
						mainWindow.hide();
					} else {
						mainWindow.show();
						mainWindow.setAlwaysOnTop(isAlwaysOnTop);
						fixWindow(mainWindow, isFixed);
					}
					store.set("windowHidden", isHidden);
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
						detail: `${packageJson.longName} ver. ${packageJson.version}\n作者：${packageJson.author} (X${packageJson.twitter})\n${TEXT_BP_COPYRIGHT}`,
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
