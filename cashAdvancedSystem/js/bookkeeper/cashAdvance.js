let allRequests = [];

document.addEventListener("DOMContentLoaded", function () {

	// Set default date filter to 'today'
	const dateFilter = document.getElementById("dateFilter");
	if (dateFilter) {
		dateFilter.value = "today";
	}
	fetchBookkeeperRequests();
	fetchBudgetStats();
	fetchCompletedStats();
	// Filter and search event listeners
	const startDate = document.getElementById("startDate");
	const endDate = document.getElementById("endDate");
	const searchInput = document.getElementById("searchInput");
	const customDateRange = document.getElementById("customDateRange");
	const statusFilter = document.getElementById("statusFilter");

	if (dateFilter) {
		dateFilter.addEventListener("change", function () {
			customDateRange.classList.toggle("hidden", this.value !== "custom");
			applyFiltersAndRender();
		});
	}
	if (startDate) startDate.addEventListener("change", applyFiltersAndRender);
	if (endDate) endDate.addEventListener("change", applyFiltersAndRender);
	if (searchInput) searchInput.addEventListener("input", applyFiltersAndRender);
	if (statusFilter)
		statusFilter.addEventListener("change", applyFiltersAndRender);

	// Apply filters initially with 'today' as default
	applyFiltersAndRender();
});

function fetchBookkeeperRequests() {
	const formData = new FormData();
	formData.append("operation", "getRequestCash");

	axios
		.post("http://localhost/cashAdvancedSystem/php/bookkeeper.php", formData)
		.then((response) => {
			let requests = response.data;
			if (typeof requests === "string") {
				try {
					requests = JSON.parse(requests);
				} catch (e) {
					requests = [];
				}
			}
			allRequests = requests;
			applyFiltersAndRender();
			updateDashboardStats(requests);
		})
		.catch((error) => {
			console.error("Error fetching requests:", error);
		});
}

function fetchBudgetStats() {
	// Fetch total budgeted
	const totalBudgetedForm = new FormData();
	totalBudgetedForm.append("operation", "getTotalBudgeted");
	axios
		.post(
			"http://localhost/cashAdvancedSystem/php/bookkeeper.php",
			totalBudgetedForm
		)
		.then((response) => {
			let totalBudgeted = response.data;
			if (typeof totalBudgeted === "string") {
				try {
					totalBudgeted = JSON.parse(totalBudgeted);
				} catch (e) {
					totalBudgeted = { total_budgeted: 0 };
				}
			}
			// Fetch used money
			const usedMoneyForm = new FormData();
			usedMoneyForm.append("operation", "getUsedMoney");
			axios
				.post(
					"http://localhost/cashAdvancedSystem/php/bookkeeper.php",
					usedMoneyForm
				)
				.then((usedRes) => {
					let usedMoney = usedRes.data;
					if (typeof usedMoney === "string") {
						try {
							usedMoney = JSON.parse(usedMoney);
						} catch (e) {
							usedMoney = { used_money: 0 };
						}
					}
					const availableMoney =
						(totalBudgeted.total_budgeted || 0) - (usedMoney.used_money || 0);
					document.getElementById("totalBudgeted").textContent =
						"₱" + (totalBudgeted.total_budgeted || 0).toLocaleString();
					document.getElementById("usedMoney").textContent =
						"₱" + (usedMoney.used_money || 0).toLocaleString();
					document.getElementById("availableMoney").textContent =
						"₱" + availableMoney.toLocaleString();
				});
		});
}

function fetchCompletedStats() {
	const formData = new FormData();
	formData.append("operation", "getCompletedStats");
	axios
		.post("http://localhost/cashAdvancedSystem/php/bookkeeper.php", formData)
		.then((response) => {
			let stats = response.data;
			if (typeof stats === "string") {
				try {
					stats = JSON.parse(stats);
				} catch (e) {
					stats = { completed_count: 0, total_advanced: 0 };
				}
			}
			document.getElementById("completedCount").textContent =
				stats.completed_count;
			document.getElementById("totalAdvanced").textContent =
				"₱" + (stats.total_advanced || 0).toLocaleString();
		});
}

function applyFiltersAndRender() {
	let filtered = [...allRequests];

	// Date filter
	const dateFilter = document.getElementById("dateFilter").value;
	const today = new Date();
	let start, end;

	if (dateFilter === "today") {
		start = new Date();
		start.setHours(0, 0, 0, 0);
		end = new Date();
		end.setHours(23, 59, 59, 999);
		filtered = filtered.filter((req) => {
			const reqDate = new Date(req.reqS_datetime);
			return reqDate >= start && reqDate <= end;
		});
	} else if (dateFilter === "week") {
		const now = new Date();
		const first = now.getDate() - now.getDay();
		start = new Date(now.setDate(first));
		start.setHours(0, 0, 0, 0);
		end = new Date(now.setDate(first + 6));
		end.setHours(23, 59, 59, 999);
		filtered = filtered.filter((req) => {
			const reqDate = new Date(req.reqS_datetime);
			return reqDate >= start && reqDate <= end;
		});
	} else if (dateFilter === "month") {
		start = new Date(today.getFullYear(), today.getMonth(), 1);
		end = new Date(
			today.getFullYear(),
			today.getMonth() + 1,
			0,
			23,
			59,
			59,
			999
		);
		filtered = filtered.filter((req) => {
			const reqDate = new Date(req.reqS_datetime);
			return reqDate >= start && reqDate <= end;
		});
	} else if (dateFilter === "custom") {
		const startDate = document.getElementById("startDate").value;
		const endDate = document.getElementById("endDate").value;
		if (startDate && endDate) {
			start = new Date(startDate + "T00:00:00");
			end = new Date(endDate + "T23:59:59");
			filtered = filtered.filter((req) => {
				const reqDate = new Date(req.reqS_datetime);
				return reqDate >= start && reqDate <= end;
			});
		}
	}

	// Status filter
	const statusFilter = document.getElementById("statusFilter").value;
	if (statusFilter && statusFilter !== "all") {
		filtered = filtered.filter(
			(req) => req.statusR_name.toLowerCase() === statusFilter
		);
	}

	// Search filter
	const search = document
		.getElementById("searchInput")
		.value.trim()
		.toLowerCase();
	if (search) {
		filtered = filtered.filter((req) => {
			const fullName = (
				req.user_firstname +
				" " +
				req.user_lastname
			).toLowerCase();
			const purpose = req.req_purpose ? req.req_purpose.toLowerCase() : "";
			const desc = req.req_desc ? req.req_desc.toLowerCase() : "";
			const budget = req.req_budget ? req.req_budget.toString() : "";
			const rawDate = req.reqS_datetime ? req.reqS_datetime.toLowerCase() : "";
			const formattedDate = formatDate(req.reqS_datetime).toLowerCase();

			return (
				fullName.includes(search) ||
				purpose.includes(search) ||
				desc.includes(search) ||
				budget.includes(search) ||
				rawDate.includes(search) ||
				formattedDate.includes(search)
			);
		});
	}

	renderBookkeeperRequests(filtered);
	updateDashboardStats(filtered);
}

function renderBookkeeperRequests(requests) {
	const container = document.getElementById("bookkeeperRequestsContainer");
	container.innerHTML = "";

	if (!requests || requests.length === 0) {
		container.innerHTML = "<div class='text-gray-500'>No requests found.</div>";
		return;
	}

	requests.forEach((req) => {
		const statusColor = getStatusColor(req.statusR_name);
		const isPending = req.statusR_name.toLowerCase() === "pending";
		const isApproved = req.statusR_name.toLowerCase() === "approved";
		const card = `
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 flex flex-col gap-3 transition hover:shadow-lg">
    <div class="flex items-center justify-between mb-2">
      <span class="font-semibold text-lg text-red-700 dark:text-red-500">${
				req.req_purpose
			}</span>
      <span class="px-3 py-1 rounded-full text-xs font-medium border ${statusColor}">
        ${req.statusR_name}
      </span>
    </div>
    <div class="text-gray-500 dark:text-gray-300 mb-2 text-sm">${
			req.req_desc
		}</div>
    <div class="text-green-600 font-bold text-xl mb-1 tracking-wide">₱${Number(
			req.req_budget
		).toLocaleString()}</div>
    <div class="flex justify-between items-center mt-2 text-xs text-gray-400">
      <span>By: <span class="font-medium text-gray-700 dark:text-gray-200">${
				req.user_firstname
			} ${req.user_lastname}</span></span>
      <span>${formatDate(req.reqS_datetime)}</span>
    </div>
    ${
			isApproved
				? `<div class=\"flex gap-2 mt-4\"><button class=\"complete-btn flex-1 bg-blue-50 dark:bg-blue-900 dark:text-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800 transition font-medium py-2 rounded-lg\" data-id=\"${req.req_id}\">Complete</button></div>`
				: ""
		}
  </div>
`;
		container.innerHTML += card;
	});

	// Add event listeners for Complete buttons
	document.querySelectorAll(".complete-btn").forEach((btn) => {
		btn.addEventListener("click", function () {
			handleRequestAction(this.dataset.id, "complete");
		});
	});
}

function getStatusColor(status) {
	switch (status.toLowerCase()) {
		case "pending":
			return "border-yellow-300 bg-yellow-50 text-yellow-800";
		case "approved":
			return "border-green-300 bg-green-50 text-green-800";
		case "rejected":
			return "border-red-300 bg-red-50 text-red-800";
		case "completed":
			return "border-blue-300 bg-blue-50 text-blue-800";
		default:
			return "border-gray-300 bg-gray-50 text-gray-800";
	}
}

function formatDate(dateString) {
	const date = new Date(dateString);
	return date.toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

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

function handleRequestAction(requestId, action) {
	let operation = "";
	if (action === "complete") {
		operation = "completeRequest";
	} else {
		return; // Only complete is supported for bookkeeper
	}
	const formData = new FormData();
	formData.append("operation", operation);

	// Retrieve userId again just in case, though it should be available from the top scope
	const currentUser = getSecureSession("user");
	const currentUserId = currentUser ? currentUser.user_id : null;

	console.log(
		`Handling action '${action}' for request ID: ${requestId}, User ID: ${currentUserId}`
	); // Log values

	if (!currentUserId) {
		showToast("Error: User session not found. Please log in again.", "error");
		console.error("User ID not found in handleRequestAction");
		return; // Stop if no user ID
	}

	formData.append(
		"json",
		JSON.stringify({ req_id: requestId, user_id: currentUserId })
	);

	const completeBtn = document.querySelector(
		`.complete-btn[data-id='${requestId}']`
	);
	if (completeBtn) completeBtn.disabled = true;

	console.log("Sending request to bookkeeper.php with payload:", {
		operation: operation,
		req_id: requestId,
		user_id: currentUserId,
	}); // Log payload

	axios
		.post("http://localhost/cashAdvancedSystem/php/bookkeeper.php", formData)
		.then((response) => {
			console.log("Response from bookkeeper.php:", response.data); // Log response
			if (response.data && response.data.success) {
				showToast("Request completed successfully!", "success");
				fetchBookkeeperRequests();
				fetchBudgetStats();
				fetchCompletedStats(); // Also refetch completed stats
			} else {
				showToast(
					response.data.error || "Failed to complete request.",
					"error"
				);
				if (completeBtn) completeBtn.disabled = false;
			}
		})
		.catch((error) => {
			console.error("Error during handleRequestAction:", error); // Log detailed error
			showToast("An error occurred. Please try again.", "error");
			if (completeBtn) completeBtn.disabled = false;
		});
}

function updateDashboardStats(requests) {
	let pending = 0,
		approved = 0;
	requests.forEach((req) => {
		const status = req.statusR_name.toLowerCase();
		if (status === "pending") pending++;
		if (status === "approved") {
			approved++;
		}
	});

	const pendingElement = document.getElementById("pendingRequestsCount");
	if (pendingElement) {
		pendingElement.textContent = pending;
	} else {
		console.warn("Element with ID 'pendingRequestsCount' not found.");
	}

	const approvedElement = document.getElementById("approvedRequestsCount");
	if (approvedElement) {
		approvedElement.textContent = approved;
	} else {
		console.warn("Element with ID 'approvedRequestsCount' not found.");
	}
	// completedCount and totalAdvanced are now set by fetchCompletedStats
}
