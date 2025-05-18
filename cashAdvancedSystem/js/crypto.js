const ENCRYPTION_KEY = "your-secure-encryption-key-123";

function encryptData(data) {
	try {
		const dataString =
			typeof data === "object" ? JSON.stringify(data) : String(data);

		let encrypted = "";
		for (let i = 0; i < dataString.length; i++) {
			const charCode =
				dataString.charCodeAt(i) ^
				ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
			encrypted += String.fromCharCode(charCode);
		}

		return btoa(encrypted);
	} catch (error) {
		console.error("Encryption error:", error);
		return null;
	}
}

function decryptData(encryptedData) {
	try {
		const decoded = atob(encryptedData);

		let decrypted = "";
		for (let i = 0; i < decoded.length; i++) {
			const charCode =
				decoded.charCodeAt(i) ^
				ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
			decrypted += String.fromCharCode(charCode);
		}

		try {
			return JSON.parse(decrypted);
		} catch {
			return decrypted;
		}
	} catch (error) {
		console.error("Decryption error:", error);
		return null;
	}
}

function setSecureSession(key, data) {
	const encryptedData = encryptData(data);
	if (encryptedData) {
		sessionStorage.setItem(key, encryptedData);
	}
}

function getSecureSession(key) {
	const encryptedData = sessionStorage.getItem(key);
	if (encryptedData) {
		return decryptData(encryptedData);
	}
	return null;
}

function clearSecureSession(key) {
	sessionStorage.removeItem(key);
}
