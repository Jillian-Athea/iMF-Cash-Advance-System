let allRequests = [];

document.addEventListener("DOMContentLoaded", function () {
	// Set default date filter to 'today'
	const dateFilter = document.getElementById("dateFilter");
	if (dateFilter) {
		dateFilter.value = "today";
	}
	fetchAdminRequests();
	fetchBudgetStats();
	fetchCompletedStats();
	fetchApprovedRequestsCount();
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

function fetchAdminRequests() {
	const formData = new FormData();
	formData.append("operation", "getRequestCash");

	axios
		.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
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

function fetchApprovedRequestsCount() {
	const formData = new FormData();
	formData.append("operation", "getApprovedRequests");

	axios
		.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
		.then((response) => {
			let approvedRequests = response.data;
			if (typeof approvedRequests === "string") {
				try {
					approvedRequests = JSON.parse(approvedRequests);
				} catch (e) {
					approvedRequests = [];
				}
			}
			const approvedElement = document.getElementById("approvedRequestsCount");
			if (approvedElement) {
				approvedElement.textContent = approvedRequests.length;
			} else {
				console.warn(
					"Element with ID 'approvedRequestsCount' not found during fetch."
				);
			}
		})
		.catch((error) => {
			console.error("Error fetching approved requests:", error);
			const approvedElement = document.getElementById("approvedRequestsCount");
			if (approvedElement) {
				approvedElement.textContent = 0;
			} else {
				console.warn(
					"Element with ID 'approvedRequestsCount' not found in fetch catch."
				);
			}
		});
}

function fetchBudgetStats() {
	const totalBudgetedForm = new FormData();
	totalBudgetedForm.append("operation", "getTotalBudgeted");
	axios
		.post(
			"http://localhost/cashAdvancedSystem/php/admin.php",
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
			const usedMoneyForm = new FormData();
			usedMoneyForm.append("operation", "getUsedMoney");
			axios
				.post(
					"http://localhost/cashAdvancedSystem/php/admin.php",
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
					const totalBudgetedEl = document.getElementById("totalBudgeted");
					if (totalBudgetedEl)
						totalBudgetedEl.textContent =
							"₱" + (totalBudgeted.total_budgeted || 0).toLocaleString();
					else console.warn("Element with ID 'totalBudgeted' not found.");

					const usedMoneyEl = document.getElementById("usedMoney");
					if (usedMoneyEl)
						usedMoneyEl.textContent =
							"₱" + (usedMoney.used_money || 0).toLocaleString();
					else console.warn("Element with ID 'usedMoney' not found.");

					const availableMoneyEl = document.getElementById("availableMoney");
					if (availableMoneyEl)
						availableMoneyEl.textContent =
							"₱" + availableMoney.toLocaleString();
					else console.warn("Element with ID 'availableMoney' not found.");
				});
		});
}

function fetchCompletedStats() {
	const formData = new FormData();
	formData.append("operation", "getCompletedStats");
	axios
		.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
		.then((response) => {
			let stats = response.data;
			if (typeof stats === "string") {
				try {
					stats = JSON.parse(stats);
				} catch (e) {
					stats = { completed_count: 0, total_advanced: 0 };
				}
			}
			const completedCountEl = document.getElementById("completedCount");
			if (completedCountEl)
				completedCountEl.textContent = stats.completed_count;
			else console.warn("Element with ID 'completedCount' not found.");

			const totalAdvancedEl = document.getElementById("totalAdvanced");
			if (totalAdvancedEl)
				totalAdvancedEl.textContent =
					"₱" + (stats.total_advanced || 0).toLocaleString();
			else console.warn("Element with ID 'totalAdvanced' not found.");
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

	renderAdminRequests(filtered);
	updateDashboardStats(filtered);
}

function renderAdminRequests(requests) {
	const container = document.getElementById("adminRequestsContainer");
	container.innerHTML = "";

	if (!requests || requests.length === 0) {
		container.innerHTML = "<div class='text-gray-500'>No requests found.</div>";
		return;
	}

	requests.forEach((req) => {
		const statusColor = getStatusColor(req.statusR_name);
		const isPending = req.statusR_name.toLowerCase() === "pending";
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
			isPending
				? `
      <div class="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-600 dark:text-gray-300">Employee's Available Limit:</span>
          <span class="text-sm font-medium" id="availableLimit-${req.req_id}">Loading...</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
          <div class="h-2.5 rounded-full" id="limitBar-${req.req_id}" style="width: 0%"></div>
        </div>
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400" id="limitWarning-${req.req_id}"></div>
      </div>
      <div class="flex gap-2 mt-4">
        <button class="approve-btn flex-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white transition font-medium py-2 rounded-lg" data-id="${req.req_id}" data-budget="${req.req_budget}" data-user-id="${req.req_userId}">Approve</button>
        <button class="reject-btn flex-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white transition font-medium py-2 rounded-lg" data-id="${req.req_id}">Reject</button>
      </div>
    `
				: ""
		}
  </div>
`;
		container.innerHTML += card;
	});

	// Add event listeners for action buttons
	document.querySelectorAll(".approve-btn").forEach((btn) => {
		btn.addEventListener("click", function () {
			handleRequestAction(this.dataset.id, "approve");
		});
	});
	document.querySelectorAll(".reject-btn").forEach((btn) => {
		btn.addEventListener("click", function () {
			handleRequestAction(this.dataset.id, "reject");
		});
	});

	// Load available limits for each pending request
	document.querySelectorAll(".approve-btn").forEach((btn) => {
		const userId = btn.dataset.userId;
		const requestId = btn.dataset.id;
		const requestBudget = Number(btn.dataset.budget);
		loadEmployeeLimit(userId, requestId, requestBudget);
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
	if (action === "approve") {
		// Get the request details
		const request = allRequests.find(
			(req) => String(req.req_id) === String(requestId)
		);
		if (!request) {
			showToast("Error: Request not found", "error");
			return;
		}

		// Check employee's available limit before approving
		const formData = new FormData();
		formData.append("operation", "getUserAvailableLimit");
		formData.append("json", JSON.stringify({ userId: request.req_userId }));

		axios
			.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
			.then((response) => {
				if (response.data && response.data.available_limit !== undefined) {
					const availableLimit = Number(response.data.available_limit);
					const requestBudget = Number(request.req_budget);

					if (requestBudget > availableLimit) {
						showToast(
							"Cannot approve: Request exceeds employee's available limit (considering already approved requests)",
							"error"
						);
						return;
					}

					// If limit check passes, proceed with approval
					proceedWithRequestAction(requestId, action);
				} else {
					showToast("Error: Could not verify employee's limit", "error");
				}
			})
			.catch((error) => {
				console.error("Error checking employee limit:", error);
				showToast("Error checking employee's limit", "error");
			});
	} else {
		// For reject action, proceed directly
		proceedWithRequestAction(requestId, action);
	}
}

function proceedWithRequestAction(requestId, action) {
	const operation = action === "approve" ? "approveRequest" : "rejectRequest";
	const formData = new FormData();
	formData.append("operation", operation);

	// Get userId reliably inside the function
	const user = getSecureSession("user");
	const currentUserId = user ? user.user_id : null;

	if (!currentUserId) {
		showToast("Error: Could not identify user. Please log in again.", "error");
		console.error("User ID not found in handleRequestAction");
		return;
	}

	formData.append(
		"json",
		JSON.stringify({ req_id: requestId, user_id: currentUserId })
	);

	// Optionally, disable buttons while processing
	const approveBtn = document.querySelector(
		`.approve-btn[data-id='${requestId}']`
	);
	const rejectBtn = document.querySelector(
		`.reject-btn[data-id='${requestId}']`
	);
	if (approveBtn) approveBtn.disabled = true;
	if (rejectBtn) rejectBtn.disabled = true;

	axios
		.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
		.then((response) => {
			if (response.data && response.data.success) {
				showToast(
					action === "approve"
						? "Request approved successfully!"
						: "Request rejected successfully!",
					"success"
				);
				fetchAdminRequests(); // Refresh the list and stats
			} else {
				showToast(response.data.error || "Failed to process request.", "error");
				if (approveBtn) approveBtn.disabled = false;
				if (rejectBtn) rejectBtn.disabled = false;
			}
		})
		.catch((error) => {
			showToast("An error occurred. Please try again.", "error");
			if (approveBtn) approveBtn.disabled = false;
			if (rejectBtn) rejectBtn.disabled = false;
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
		console.warn(
			"Element with ID 'pendingRequestsCount' not found in updateDashboardStats."
		);
	}

	// Note: approvedRequestsCount is now primarily updated by fetchApprovedRequestsCount
	// However, we can still update it here based on the locally filtered list if needed for responsiveness,
	// or decide to rely solely on fetchApprovedRequestsCount for its specific value.
	// For now, let's keep this update for consistency with local filtering if that's the intent.
	const approvedElement = document.getElementById("approvedRequestsCount");
	if (approvedElement) {
		approvedElement.textContent = approved; // This updates based on the filtered list
	} else {
		console.warn(
			"Element with ID 'approvedRequestsCount' not found in updateDashboardStats."
		);
	}
	// completedCount and totalAdvanced are now set by fetchCompletedStats
}

// Add new function to load employee limit
function loadEmployeeLimit(userId, requestId, requestBudget) {
	const formData = new FormData();
	formData.append("operation", "getUserAvailableLimit");
	formData.append("json", JSON.stringify({ userId: userId }));

	axios
		.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
		.then((response) => {
			if (response.data && response.data.available_limit !== undefined) {
				const availableLimit = Number(response.data.available_limit);
				const limitElement = document.getElementById(
					`availableLimit-${requestId}`
				);
				const limitBar = document.getElementById(`limitBar-${requestId}`);
				const limitWarning = document.getElementById(
					`limitWarning-${requestId}`
				);
				const approveBtn = document.querySelector(
					`.approve-btn[data-id='${requestId}']`
				);

				if (limitElement) {
					limitElement.textContent = `₱${availableLimit.toLocaleString()}`;
				}

				// Calculate percentage of limit that will be used
				const percentageUsed = (requestBudget / availableLimit) * 100;
				if (limitBar) {
					limitBar.style.width = `${Math.min(percentageUsed, 100)}%`;

					// Set color based on percentage
					if (percentageUsed > 100) {
						limitBar.className = "h-2.5 rounded-full bg-red-500";
						limitWarning.textContent =
							"Warning: This request exceeds the employee's available limit!";
						limitWarning.className =
							"mt-2 text-xs text-red-500 dark:text-red-400";
						if (approveBtn) {
							approveBtn.disabled = true;
							approveBtn.classList.add("opacity-50", "cursor-not-allowed");
						}
					} else if (percentageUsed > 80) {
						limitBar.className = "h-2.5 rounded-full bg-yellow-500";
						limitWarning.textContent =
							"Warning: This request will use most of the employee's available limit.";
						limitWarning.className =
							"mt-2 text-xs text-yellow-500 dark:text-yellow-400";
					} else {
						limitBar.className = "h-2.5 rounded-full bg-green-500";
						limitWarning.textContent =
							"Employee has sufficient available limit.";
						limitWarning.className =
							"mt-2 text-xs text-green-500 dark:text-green-400";
					}
				}
			}
		})
		.catch((error) => {
			console.error("Error loading employee limit:", error);
		});
}