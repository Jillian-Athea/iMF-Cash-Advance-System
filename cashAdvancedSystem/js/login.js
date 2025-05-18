function showToast(message, type = "success") {
	const toast = document.getElementById("toast");
	const toastMessage = document.getElementById("toastMessage");
	const icon = toast.querySelector("i");

	// Set message
	toastMessage.textContent = message;

	// Reset classes
	toast.className =
		"fixed bottom-6 right-6 z-50 min-w-[200px] max-w-xs rounded-lg shadow-lg px-6 py-4 flex items-center space-x-3 transition-all duration-300";
	icon.className = "fas";

	// Set type-specific styles
	if (type === "success") {
		toast.classList.add("bg-green-500", "text-white");
		icon.classList.add("fa-check-circle");
	} else if (type === "error") {
		toast.classList.add("bg-red-500", "text-white");
		icon.classList.add("fa-exclamation-circle");
	} else {
		toast.classList.add("bg-gray-800", "text-white");
		icon.classList.add("fa-info-circle");
	}

	// Show toast
	toast.classList.remove("hidden");

	// Hide after 3 seconds
	setTimeout(() => {
		toast.classList.add("hidden");
	}, 3000);
}

document.addEventListener("DOMContentLoaded", function () {
	const loginForm = document.getElementById("loginForm");
	const loginBtn = document.getElementById("loginBtn");
	const loginBtnText = document.getElementById("loginBtnText");
	const loginSpinner = document.getElementById("loginSpinner");

	loginForm.addEventListener("submit", async function (e) {
		e.preventDefault();

		const username = document.getElementById("username").value;
		const password = document.getElementById("password").value;

		const formData = new FormData();
		formData.append("operation", "login");
		formData.append(
			"json",
			JSON.stringify({
				username: username,
				password: password,
			})
		);

		// Show loading spinner
		loginBtn.disabled = true;
		loginBtnText.textContent = "Signing In...";
		loginSpinner.classList.remove("hidden");

		try {
			const response = await axios.post(
				"http://localhost/cashAdvancedSystem/php/admin.php",
				formData
			);
			const data = response.data;

			if (data) {
				// Store encrypted user data in sessionStorage
				setSecureSession("user", data);

				console.log("User Level:", data.user_userLevelDesc);
				console.log("User Level Type:", typeof data.user_userLevelDesc);

				showToast("Login successful!", "success");

				setTimeout(() => {
					// Redirect based on user level
					switch (data.user_userLevelDesc) {
						case "100.0": // Admin
							window.location.href = "admin/dashboard.html";
							break;
						case "50.0": // Owner
							window.location.href = "owner/dashboard.html";
							break;
						case "20.0": // Bookkeeper
							window.location.href = "bookkeeper/dashboard.html";
							break;
						case "10.0": // Employee
							window.location.href = "employee/dashboard.html";
							break;
						default:
							showToast("Invalid user level", "error");
					}
				}, 1000);
			} else {
				showToast("Invalid username or password", "error");
			}
		} catch (error) {
			console.error("Login error:", error);
			showToast("An error occurred during login. Please try again.", "error");
		} finally {
			// Hide loading spinner
			loginBtn.disabled = false;
			loginBtnText.textContent = "Sign In";
			loginSpinner.classList.add("hidden");
		}
	});
});
