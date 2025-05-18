// request-history.js - Handles the request history page functionality
document.addEventListener("DOMContentLoaded", function () {
	// Load request history
	loadRequestHistory();

	// Add event listeners for filters
	const statusFilter = document.getElementById("statusFilter");
	const dateFilter = document.getElementById("dateFilter");
	const startDate = document.getElementById("startDate");
	const endDate = document.getElementById("endDate");
	const searchInput = document.getElementById("searchInput");
	const customDateRange = document.getElementById("customDateRange");

	if (statusFilter)
		statusFilter.addEventListener("change", function () {
			loadRequestHistory(this.value);
		});
	if (dateFilter) {
		dateFilter.addEventListener("change", function () {
			customDateRange.classList.toggle("hidden", this.value !== "custom");
			applyFiltersAndRender(true);
		});
	}
	if (startDate)
		startDate.addEventListener("change", function () {
			applyFiltersAndRender(true);
		});
	if (endDate)
		endDate.addEventListener("change", function () {
			applyFiltersAndRender(true);
		});
	if (searchInput)
		searchInput.addEventListener("input", function () {
			applyFiltersAndRender(true);
		});
});

let allRequests = [];

// Load user's request history
function loadRequestHistory(statusFilterValue = "all") {
	const user = getSecureSession("user");
	if (!user) {
		console.error("No user data found in session");
		return;
	}

	// Show loading state
	const loadingState = document.getElementById("loadingState");
	const emptyState = document.getElementById("emptyState");
	const tableBody = document.getElementById("requestHistoryTable");

	loadingState.classList.remove("hidden");
	emptyState.classList.add("hidden");
	tableBody.innerHTML = "";

	const formData = new FormData();
	if (statusFilterValue && statusFilterValue !== "all") {
		formData.append("operation", "getRequestCashByStatus");
		formData.append(
			"json",
			JSON.stringify({
				userId: user.user_id,
				status: capitalizeFirstLetter(statusFilterValue),
			})
		);
	} else {
		formData.append("operation", "getRequestCash");
		formData.append("json", JSON.stringify({ userId: user.user_id }));
	}

	axios
		.post("http://localhost/cashAdvancedSystem/php/employee.php", formData)
		.then((response) => {
			let requests = [];
			if (response.data) {
				// Handle both string and object responses
				if (typeof response.data === "string") {
					try {
						const decryptedData = decryptData(response.data);
						if (decryptedData) {
							requests =
								typeof decryptedData === "string"
									? JSON.parse(decryptedData)
									: decryptedData;
						}
					} catch (error) {
						console.error("Error processing encrypted response data:", error);
					}
				} else {
					requests = response.data;
				}
			}

			// Ensure requests is an array
			if (!Array.isArray(requests)) {
				console.warn("Requests data is not an array:", requests);
				requests = [];
			}

			allRequests = requests;
			applyFiltersAndRender(true); // Indicate that data is freshly loaded
		})
		.catch((error) => {
			console.error("Error loading request history:", error);
			showToast(
				"Error loading request history. Please try again later.",
				"error"
			);
		})
		.finally(() => {
			loadingState.classList.add("hidden");
		});
}

function capitalizeFirstLetter(str) {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Apply filters and render the table
function applyFiltersAndRender(isFreshLoad = false) {
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
	} else if (dateFilter === "week") {
		const now = new Date();
		const first = now.getDate() - now.getDay();
		start = new Date(now.setDate(first));
		start.setHours(0, 0, 0, 0);
		end = new Date(now.setDate(first + 6));
		end.setHours(23, 59, 59, 999);
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
	} else if (dateFilter === "custom") {
		const startDate = document.getElementById("startDate").value;
		const endDate = document.getElementById("endDate").value;
		if (startDate && endDate) {
			start = new Date(startDate + "T00:00:00");
			end = new Date(endDate + "T23:59:59");
		}
	}

	if (start && end) {
		filtered = filtered.filter((req) => {
			const reqDate = new Date(req.reqS_datetime);
			return reqDate >= start && reqDate <= end;
		});
	}

	// Search filter
	const search = document
		.getElementById("searchInput")
		.value.trim()
		.toLowerCase();
	if (search) {
		filtered = filtered.filter((req) => {
			const purpose = req.req_purpose ? req.req_purpose.toLowerCase() : "";
			const desc = req.req_desc ? req.req_desc.toLowerCase() : "";
			const budget = req.req_budget ? req.req_budget.toString() : "";
			return (
				purpose.includes(search) ||
				desc.includes(search) ||
				budget.includes(search)
			);
		});
	}

	// Render the filtered results
	renderRequestTable(filtered);
}

// Render the request table
function renderRequestTable(requests) {
	const tableBody = document.getElementById("requestHistoryTable");
	const emptyState = document.getElementById("emptyState");

	tableBody.innerHTML = "";

	if (!requests || requests.length === 0) {
		emptyState.classList.remove("hidden");
		return;
	}

	emptyState.classList.add("hidden");

	requests.forEach((request) => {
		const date = new Date(request.reqS_datetime);
		const formattedDate = date.toLocaleString("en-PH", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
			timeZone: "Asia/Manila",
		});

		// Status badge color and icon
		let statusClass = "";
		let statusIcon = "";
		switch ((request.statusR_name || "").toLowerCase()) {
			case "pending":
				statusClass =
					"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
				statusIcon = "fa-clock";
				break;
			case "approved":
				statusClass =
					"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
				statusIcon = "fa-check-circle";
				break;
			case "rejected":
				statusClass =
					"bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
				statusIcon = "fa-times-circle";
				break;
			case "completed":
				statusClass =
					"bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
				statusIcon = "fa-check-double";
				break;
			default:
				statusClass =
					"bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
				statusIcon = "fa-question-circle";
		}

		const row = document.createElement("tr");
		row.className = "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors";
		row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                ${formattedDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                ${request.req_purpose}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                ${request.req_desc || "-"}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                ₱${Number(request.req_budget).toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                    <i class="fas ${statusIcon} mr-1"></i>
                    ${request.statusR_name}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <button onclick="showRequestDetailsModal(${JSON.stringify(
									request
								).replace(
									/"/g,
									"&quot;"
								)})" class="text-primary hover:text-secondary focus:outline-none" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
		tableBody.appendChild(row);
	});
}

// Toast notification
function showToast(message, type = "success") {
	const toast = document.getElementById("toast");
	toast.textContent = message;
	toast.className =
		"fixed bottom-6 right-6 z-50 min-w-[200px] max-w-xs rounded-lg shadow-lg px-6 py-4 flex items-center space-x-3 transition-all duration-300";

	if (type === "success") {
		toast.classList.add("bg-green-500", "text-white");
	} else if (type === "error") {
		toast.classList.add("bg-red-500", "text-white");
	} else {
		toast.classList.add("bg-gray-800", "text-white");
	}

	toast.classList.remove("hidden");
	setTimeout(() => {
		toast.classList.add("hidden");
	}, 3000);
}

// Add this function after the renderRequestTable function
function showRequestDetailsModal(request) {
	let modal = document.getElementById("requestDetailsModal");
	if (!modal) {
		modal = document.createElement("div");
		modal.id = "requestDetailsModal";
		modal.className = "fixed inset-0 z-50 overflow-y-auto hidden";
		document.body.appendChild(modal);
	}
	// Always update modal content
	modal.innerHTML = `
		<div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
			<div class="fixed inset-0 transition-opacity" aria-hidden="true">
				<div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
			</div>
			<span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
			<div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
				<div class="bg-primary px-4 py-3 flex justify-between items-center">
					<h3 class="text-lg font-semibold text-white">Request Details</h3>
					<button id="closeModal" class="text-white hover:text-gray-200 focus:outline-none">
						<i class="fas fa-times"></i>
					</button>
				</div>
				<div class="px-4 py-5 sm:p-6">
					<div class="mb-6">
						<div class="flex items-center justify-between mb-4">
							<h4 class="text-xl font-semibold text-gray-900 dark:text-gray-100">${
								request.req_purpose
							}</h4>
							<span class="px-3 py-1 text-sm font-semibold rounded-full ${getStatusClass(
								request.statusR_name
							)}">
								<i class="fas ${getStatusIcon(request.statusR_name)} mr-1"></i>
								${request.statusR_name}
							</span>
						</div>
						<p class="text-gray-600 dark:text-gray-300 mb-4">${
							request.req_desc || "No description provided"
						}</p>
						<div class="grid grid-cols-2 gap-4 mb-6">
							<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
								<p class="text-sm text-gray-500 dark:text-gray-400">Amount</p>
								<p class="text-xl font-semibold text-green-600 dark:text-green-400">₱${Number(
									request.req_budget
								).toLocaleString()}</p>
							</div>
							<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
								<p class="text-sm text-gray-500 dark:text-gray-400">Request Date</p>
								<p class="text-lg font-medium text-gray-900 dark:text-gray-100">${new Date(
									request.reqS_datetime
								).toLocaleString("en-PH", {
									year: "numeric",
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
									hour12: true,
									timeZone: "Asia/Manila",
								})}</p>
							</div>
						</div>
					</div>
					
					<div class="border-t border-gray-200 dark:border-gray-700 pt-4">
						<h5 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Status Timeline</h5>
						<div id="statusTimeline" class="space-y-4">
							<!-- Timeline items will be inserted here -->
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
	// Re-attach close event
	document.getElementById("closeModal").onclick = () =>
		modal.classList.add("hidden");
	modal.onclick = (e) => {
		if (e.target === modal) modal.classList.add("hidden");
	};

	// Load status history
	loadStatusHistory(request.req_id, modal);

	modal.classList.remove("hidden");
}

// Add these helper functions
function getStatusClass(status) {
	switch (status.toLowerCase()) {
		case "pending":
			return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
		case "approved":
			return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
		case "rejected":
			return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
		case "completed":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		default:
			return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
	}
}

function getStatusIcon(status) {
	switch (status.toLowerCase()) {
		case "pending":
			return "fa-clock";
		case "approved":
			return "fa-check-circle";
		case "rejected":
			return "fa-times-circle";
		case "completed":
			return "fa-check-double";
		default:
			return "fa-question-circle";
	}
}

// Add this function to load status history
function loadStatusHistory(requestId, modal) {
	const user = getSecureSession("user");
	if (!user) return;

	const formData = new FormData();
	formData.append("operation", "getRequestStatusHistory");
	formData.append(
		"json",
		JSON.stringify({ requestId: requestId, userId: user.user_id })
	);

	const timelineContainer = modal.querySelector("#statusTimeline");
	timelineContainer.innerHTML =
		'<div class="text-center py-4"><div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div></div>';

	axios
		.post("http://localhost/cashAdvancedSystem/php/employee.php", formData)
		.then((response) => {
			let statusHistory = [];
			if (response.data) {
				console.log("response.data", response.data);
				if (typeof response.data === "string") {
					try {
						const decryptedData = decryptData(response.data);
						if (decryptedData) {
							statusHistory =
								typeof decryptedData === "string"
									? JSON.parse(decryptedData)
									: decryptedData;
						}
					} catch (error) {
						console.error("Error processing encrypted response data:", error);
					}
				} else {
					statusHistory = response.data;
				}
			}

			if (!Array.isArray(statusHistory)) {
				statusHistory = [];
			}

			// Sort by datetime
			statusHistory.sort(
				(a, b) => new Date(b.reqS_datetime) - new Date(a.reqS_datetime)
			);

			// Render timeline
			timelineContainer.innerHTML =
				statusHistory
					.map((status, index) => {
						const date = new Date(status.reqS_datetime);
						const formattedDate = date.toLocaleString("en-PH", {
							year: "numeric",
							month: "short",
							day: "numeric",
							hour: "2-digit",
							minute: "2-digit",
							hour12: true,
							timeZone: "Asia/Manila",
						});

						return `
					<div class="flex items-start">
						<div class="flex-shrink-0">
							<div class="flex items-center justify-center h-8 w-8 rounded-full ${getStatusClass(
								status.statusR_name
							)}">
								<i class="fas ${getStatusIcon(status.statusR_name)}"></i>
							</div>
							${
								index < statusHistory.length - 1
									? '<div class="h-full w-0.5 bg-gray-200 dark:bg-gray-700 mx-auto"></div>'
									: ""
							}
						</div>
						<div class="ml-4 flex-1">
							<div class="flex items-center justify-between">
								<p class="text-sm font-medium text-gray-900 dark:text-gray-100">${
									status.statusR_name
								}</p>
								<p class="text-sm text-gray-500 dark:text-gray-400">${formattedDate}</p>
							</div>
							${
								status.reqS_remarks
									? `<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">${status.reqS_remarks}</p>`
									: ""
							}
						</div>
					</div>
				`;
					})
					.join("") ||
				'<p class="text-center text-gray-500 dark:text-gray-400">No status history available</p>';
		})
		.catch((error) => {
			console.error("Error loading status history:", error);
			timelineContainer.innerHTML =
				'<p class="text-center text-red-500">Error loading status history</p>';
		});
}
