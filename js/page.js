(function() {
	const baseDate = "2025-01-10T06:02:10+09:00";
	const trayImages = [
		"media/night.png",
		"media/day.png",
	];
	const { ipcRenderer } = require("electron");

	function getElapsedMinutes(targetDate) {
		const now = new Date();
		const target = new Date(targetDate);
		const elapsedMilliseconds = now - target;
		const elapsedMinutes = elapsedMilliseconds / 1000 / 60;
		return elapsedMinutes;
	}

	function drawClock() {
		const elapsedMinutes = getElapsedMinutes(baseDate);
		const timeRatio = elapsedMinutes%25/25*100;
		const isDay = Math.floor(elapsedMinutes/25)%2 == 0 ? 1 : 0;

		const clock = document.querySelector(".clock");
		clock.style.setProperty("--time-ratio", timeRatio);
		clock.style.setProperty("--time-is-day", isDay);

		// タスクトレイのアイコンを変更する
		generateTrayIcon(timeRatio, isDay).then((iconImage) => {
			ipcRenderer.send("update-tray-icon", iconImage);
		});
	}

	function generateTrayIcon(timeRatio, isDay) {
		return new Promise((resolve, reject) => {
			const canvas = document.getElementById("trayIconCanvas");
			const image = document.getElementById("trayIconImage" + isDay);
			const ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		
			// 外側の扇形
			ctx.beginPath();
			ctx.arc(32, 32, 32, 2*Math.PI * (0-0.25), 2*Math.PI * (timeRatio/100 - 0.25));
			ctx.lineTo(32, 32);
			ctx.closePath();
			ctx.fillStyle = "hsla(0, 0%, 100%, 1)";
			ctx.fill();
	
			// 内側を透明にする（切り抜き）
			ctx.globalCompositeOperation = "destination-out"; // 切り抜きモード
			ctx.beginPath();
			ctx.arc(32, 32, 27, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fillStyle = "black"; // 塗りつぶし色は無関係（切り抜きされる）
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";
	
			// icon
			ctx.drawImage(image,  0, 0, canvas.width, canvas.height);
			resolve(canvas.toDataURL("image/png"));
		});
	}

	setInterval(function() {
		drawClock();
	}, 1000);
	drawClock();
})();
