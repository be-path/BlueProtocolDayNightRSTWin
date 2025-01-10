import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage  } from "electron";
import Store from "electron-store";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let tray;
let isAlwaysOnTop = true; // 初期状態: 最前面表示

const store = new Store();

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		const context = this;
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(context, args), wait);
	};
}

app.on("ready", async () => {
	const windowBounds = store.get("windowBounds", {
		width: 200,
		height: 200,
		x: undefined,
		y: undefined
	});

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
			nodeIntegration: true,  // Node.js 統合を無効化
			contextIsolation: false,  // レンダラープロセスの隔離
			devTools: false,         // 開発者ツールを無効化
		},
	});

	mainWindow.loadFile("index.html");

	// デバウンス付きの保存処理
	const saveBounds = debounce(() => {
		const bounds = mainWindow.getBounds();
		store.set("windowBounds", bounds);
	}, 500);

	mainWindow.on("move", () => {
		mainWindow.setBackgroundColor("#11FFFFFF"); // 背景色を設定して枠を表示

		// リサイズ終了後の処理（300ms後に透明に戻す）
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			mainWindow.setBackgroundColor("#00000000"); // 完全に透明に戻す
		}, 2000);
		saveBounds();
	});

	let resizeTimeout;
	mainWindow.on("resize", () => {
		mainWindow.setBackgroundColor("#11FFFFFF"); // 背景色を設定して枠を表示

		// リサイズ終了後の処理（300ms後に透明に戻す）
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			mainWindow.setBackgroundColor("#00000000"); // 完全に透明に戻す
		}, 2000);
		saveBounds();
	});

	mainWindow.show();
	
	const updateContextMenu = () => {
		const contextMenu = Menu.buildFromTemplate([
			{
				label: isAlwaysOnTop ? "最前面を解除" : "最前面に表示",
				click: () => {
					isAlwaysOnTop = !isAlwaysOnTop;
					mainWindow.setAlwaysOnTop(isAlwaysOnTop);
					updateContextMenu();
				},
			},
			{
				label: "終了",
				click: () => {
					app.quit();
				},
			},
		]);
		tray.setContextMenu(contextMenu);
	};
 
	const iconPath = join(__dirname, "media", "day.png");
	tray = new Tray(iconPath);
	tray.setToolTip("BLUE PROTOCOL Day Night Widget (Regnas Standard Time)");
	updateContextMenu()

	ipcMain.on("update-tray-icon", (event, imageData) => {
		const trayIcon = nativeImage.createFromDataURL(imageData);
		tray.setImage(trayIcon);
	});
});
