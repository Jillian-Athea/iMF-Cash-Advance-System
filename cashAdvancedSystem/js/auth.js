// Check if user is logged in and redirect if necessary
function checkAuth() {
	const user = getSecureSession("user");
	const currentPath = window.location.pathname;

	// If on login page and user is logged in, redirect to appropriate dashboard
	if (currentPath.includes("login.html") && user) {
		switch (user.user_userLevelDesc) {
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
		}
		return;
	}

	// If not on login page and user is not logged in, redirect to login
	if (!currentPath.includes("login.html") && !user) {
		window.location.href = "login.html";
		return;
	}

	// If user is logged in, check if they're trying to access unauthorized pages
	if (user && !currentPath.includes("login.html")) {
		const userLevel = user.user_userLevelDesc;
		const isAuthorized =
			(userLevel === "100.0" && currentPath.includes("/admin/")) ||
			(userLevel === "50.0" && currentPath.includes("/owner/")) ||
			(userLevel === "20.0" && currentPath.includes("/bookkeeper/")) ||
			(userLevel === "10.0" && currentPath.includes("/employee/"));

		if (!isAuthorized) {
			// Redirect to appropriate dashboard based on user level
			switch (userLevel) {
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
			}
		}
	}
}

// Run auth check when page loads
document.addEventListener("DOMContentLoaded", checkAuth);
