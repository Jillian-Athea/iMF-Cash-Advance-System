// request.js - Handles cash advance request functionality for employees
document.addEventListener("DOMContentLoaded", function () {
	// Load cash methods for dropdown
	loadCashMethods();

	// Load status requests for reference
	loadStatusRequests();

	// Load user's request history
	loadRequestHistory();

	// Load user's available limit
	loadUserAvailableLimit();

	// Filter and search event listeners
	const dateFilter = document.getElementById("dateFilter");
	const startDate = document.getElementById("startDate");
	const endDate = document.getElementById("endDate");
	const searchInput = document.getElementById("searchInput");
	const customDateRange = document.getElementById("customDateRange");

	if (dateFilter) {
		dateFilter.addEventListener("change", function () {
			customDateRange.classList.toggle("hidden", this.value !== "custom");
			applyFiltersAndRender();
		});
	}
	if (startDate) startDate.addEventListener("change", applyFiltersAndRender);
	if (endDate) endDate.addEventListener("change", applyFiltersAndRender);
	if (searchInput) searchInput.addEventListener("input", applyFiltersAndRender);

	// Event listeners
	document
		.querySelector(".bg-primary.hover\\:bg-secondary")
		.addEventListener("click", openRequestModal);
});

// Load cash method options for the dropdown
function loadCashMethods() {
	const formData = new FormData();
	formData.append("operation", "CashMethod");

	axios
		.post("http://localhost/cashAdvancedSystem/php/employee.php", formData)
		.then((response) => {
			const cashMethods = response.data;
			// Store for later use in the modal
			setSecureSession("cashMethods", cashMethods);
		})
		.catch((error) => {
			console.error("Error loading cash methods:", error);
		});
}

// Load status requests for reference
function loadStatusRequests() {
	const formData = new FormData();
	formData.append("operation", "statusRequest");

	axios
		.post("http://localhost/cashAdvancedSystem/php/employee.php", formData)
		.then((response) => {
			const statusRequests = response.data;
			// Store for later use
			setSecureSession("statusRequests", statusRequests);
		})
		.catch((error) => {
			console.error("Error loading status requests:", error);
		});
}

let allRequests = [];

// Load user's request history
function loadRequestHistory() {
	const user = getSecureSession("user");
	if (!user) {
		console.error("No user data found in session");
		return;
	}

	const formData = new FormData();
	formData.append("operation", "getRequestCash");
	formData.append("json", JSON.stringify({ userId: user.user_id }));

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
			applyFiltersAndRender();
			updateDashboardStats(requests);
		})
		.catch((error) => {
			console.error("Error loading request history:", error);
			const grid = document.getElementById("recentRequestsGrid");
			if (grid) {
				grid.innerHTML = `<div class='col-span-full text-center text-red-500 py-6'>Error loading requests. Please try again later.</div>`;
			}
		});
}

// Load user's available limit
function loadUserAvailableLimit() {
	const user = getSecureSession("user");
	if (!user) {
		console.error("No user data found in session");
		return;
	}

	const formData = new FormData();
	formData.append("operation", "getUserAvailableLimit");
	formData.append("json", JSON.stringify({ userId: user.user_id }));

	axios
		.post("http://localhost/cashAdvancedSystem/php/employee.php", formData)
		.then((response) => {
			if (response.data && response.data.available_limit !== undefined) {
				const availableLimit = Number(response.data.available_limit);
				const baseLimit = Number(response.data.base_limit);
				const totalCompleted = Number(response.data.total_completed);
				const userStatus = response.data.user_status; // Get user_status

				// Store user status in session for broader use
				setSecureSession("userStatus", userStatus);

				// Format numbers with 2 decimal places
				const formatCurrency = (amount) => {
					return `₱${amount.toLocaleString(undefined, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}`;
				};

				// Update the display
				document.getElementById("availableLimit").textContent =
					formatCurrency(availableLimit);
				document.getElementById("baseLimit").textContent =
					formatCurrency(baseLimit);
				document.getElementById("totalCompleted").textContent =
					formatCurrency(totalCompleted);

				// Store the limit for validation
				setSecureSession("availableLimit", availableLimit);

				// Disable/Enable New Request button based on status
				const newRequestButton = document.getElementById("newRequestBtn");
				if (newRequestButton) {
					if (userStatus === "0" || userStatus === 0) {
						// Assuming '0' means Suspended/Disabled
						newRequestButton.disabled = true;
						newRequestButton.classList.add("opacity-50", "cursor-not-allowed");
						newRequestButton.title =
							"Your account is currently suspended from making new requests.";
					} else {
						newRequestButton.disabled = false;
						newRequestButton.classList.remove(
							"opacity-50",
							"cursor-not-allowed"
						);
						newRequestButton.title = "";
					}
				}
			}
		})
		.catch((error) => {
			console.error("Error loading available limit:", error);
		});
}

// Populate the request table with data
function populateRequestTable(requests) {
	const grid = document.getElementById("recentRequestsGrid");
	grid.innerHTML = "";

	if (!Array.isArray(requests) || requests.length === 0) {
		grid.innerHTML = `<div class='col-span-full text-center text-gray-500 dark:text-gray-400 py-6'>No requests found</div>`;
		return;
	}

	requests.forEach((request) => {
		if (
			!request ||
			request.req_id == null ||
			request.reqS_datetime == null ||
			request.req_purpose == null ||
			request.req_budget == null ||
			request.statusR_name == null
		) {
			console.warn("Invalid request data:", request);
			return;
		}

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

		// Status badge color
		let statusClass = "";
		switch ((request.statusR_name || "").toLowerCase()) {
			case "pending":
				statusClass = "bg-yellow-100 text-yellow-800";
				break;
			case "approved":
				statusClass = "bg-green-100 text-green-800";
				break;
			case "rejected":
				statusClass = "bg-red-100 text-red-800";
				break;
			case "completed":
				statusClass = "bg-blue-100 text-blue-800";
				break;
			case "cancelled":
				statusClass = "bg-gray-300 text-gray-700";
				break;
			default:
				statusClass = "bg-gray-100 text-gray-800";
		}

		const isPending = (request.statusR_name || "").toLowerCase() === "pending";

		const card = document.createElement("div");
		card.className =
			"bg-gray-100/90 dark:bg-gray-700 rounded-lg shadow p-5 flex flex-col gap-2 border-t-4";
		card.style.borderTopColor = "#8B1C23"; // sidebar primary color
		card.innerHTML = `
			<div class="flex justify-between items-center mb-1">
				<span class="font-semibold text-lg dark:text-red-500 text-red-700">${
					request.req_purpose
				}</span>
				<span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">${
			request.statusR_name
		}</span>
			</div>
			<div class="text-gray-500 dark:text-gray-300 text-sm mb-2">${
				request.req_desc || ""
			}</div>
			<div class="flex justify-between items-end mt-auto">
				<span class="text-xl font-bold text-green-700 dark:text-green-400">₱${Number(
					request.req_budget
				).toLocaleString()}</span>
				<span class="text-xs text-gray-400">${formattedDate}</span>
			</div>
			${
				isPending
					? `<div class="flex gap-2 mt-3">
					<button class="cancel-btn bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200" data-id="${request.req_id}">Cancel</button>
					<button class="edit-btn bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200" data-id="${request.req_id}">Edit</button>
				</div>`
					: ""
			}
		`;
		grid.appendChild(card);
	});

	// Add event listeners for cancel and edit buttons
	document.querySelectorAll(".cancel-btn").forEach((btn) => {
		btn.addEventListener("click", function () {
			const requestId = this.dataset.id;
			cancelRequestHandler(requestId);
		});
	});
	document.querySelectorAll(".edit-btn").forEach((btn) => {
		btn.addEventListener("click", function () {
			const requestId = this.dataset.id;
			editRequestHandler(requestId);
		});
	});
}

// Update dashboard statistics
function updateDashboardStats(requests) {
	if (!requests) return;

	// Count pending requests
	const pendingCount = requests.filter(
		(request) => request.statusR_name.toLowerCase() === "pending"
	).length;

	// Count approved requests
	const approvedCount = requests.filter(
		(request) => request.statusR_name.toLowerCase() === "approved"
	).length;

	// Count completed requests
	const completedCount = requests.filter(
		(request) => request.statusR_name.toLowerCase() === "completed"
	).length;

	// Calculate total advanced amount (approved + completed)
	const totalAdvanced = requests
		.filter((request) =>
			["completed"].includes(request.statusR_name.toLowerCase())
		)
		.reduce((sum, request) => sum + Number(request.req_budget), 0);

	// Update stats in DOM using IDs
	const pendingElem = document.getElementById("pendingRequestsCount");
	const approvedElem = document.getElementById("approvedRequestsCount");
	const totalElem = document.getElementById("totalAdvanced");
	const completedElem = document.getElementById("completedCount");

	if (pendingElem) pendingElem.textContent = pendingCount;
	if (approvedElem) approvedElem.textContent = approvedCount;
	if (totalElem) totalElem.textContent = `₱${totalAdvanced.toLocaleString()}`;
	if (completedElem) completedElem.textContent = completedCount;
}

// Open the request modal
function openRequestModal() {
	// Check user status before opening modal
	const userStatus = getSecureSession("userStatus");
	if (userStatus === "0" || userStatus === 0) {
		// Assuming '0' means Suspended/Disabled
		showToast(
			"Your account is currently suspended. You cannot make new requests. Please contact an administrator.",
			"error"
		);
		return;
	}

	// Check if modal already exists
	let modal = document.getElementById("requestModal");

	if (!modal) {
		// Create modal if it doesn't exist
		modal = document.createElement("div");
		modal.id = "requestModal";
		modal.classList.add(
			"fixed",
			"inset-0",
			"z-50",
			"overflow-auto",
			"bg-black",
			"bg-opacity-50",
			"flex",
			"items-center",
			"justify-center"
		);

		// Get cash methods from session storage
		const cashMethods = getSecureSession("cashMethods") || [];

		// Generate cash method options
		const cashMethodOptions = cashMethods
			.map(
				(method) =>
					`<option value="${method.cashM_id}">${method.cashM_name}</option>`
			)
			.join("");

		modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 overflow-hidden">
                <div class="bg-primary p-4 text-white flex justify-between items-center">
                    <h3 class="text-lg font-semibold">New Cash Advance Request</h3>
                    <button id="closeModal" class="text-white hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="requestForm" class="p-6">
                    <div class="mb-4">
                        <label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" for="purpose">
                            Purpose
                        </label>
                        <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                            id="purpose" type="text" placeholder="Purpose of cash advance" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" for="desc">
                            Description
                        </label>
                        <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                            id="desc" type="text" placeholder="Description (optional)">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" for="budget">
                            Amount (₱)
                        </label>
                        <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                            id="budget" type="number" placeholder="Enter amount" min="1" required>
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" for="cashMethodId">
                            Cash Method
                        </label>
                        <select class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                            id="cashMethodId" required>
                            <option value="">Select a cash method</option>
                            ${cashMethodOptions}
                        </select>
                    </div>
                    <div class="flex items-center justify-between">
                        <button class="bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" 
                            type="submit">
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        `;

		document.body.appendChild(modal);

		// Add event listeners for the modal
		document
			.getElementById("closeModal")
			.addEventListener("click", closeRequestModal);
		document
			.getElementById("requestForm")
			.addEventListener("submit", submitRequest);

		// Close modal when clicking outside
		modal.addEventListener("click", function (e) {
			if (e.target === modal) {
				closeRequestModal();
			}
		});
	} else {
		// Show existing modal
		modal.classList.remove("hidden");
	}
}

// Close the request modal
function closeRequestModal() {
	const modal = document.getElementById("requestModal");
	if (modal) {
		// Option 1: Remove the modal completely
		modal.remove();

		// Option 2: Hide the modal
		// modal.classList.add('hidden');
	}
}

// Submit the request form
function submitRequest(e) {
	e.preventDefault();

	const user = getSecureSession("user");
	if (!user) {
		showToast("You must be logged in to submit a request", "error");
		return;
	}

	const purpose = document.getElementById("purpose").value;
	const desc = document.getElementById("desc").value;
	const budget = Number(document.getElementById("budget").value);
	const cashMethodId = document.getElementById("cashMethodId").value;

	// Get available limit from session
	const availableLimit = Number(getSecureSession("availableLimit") || 0);

	// Validation
	if (!purpose || !budget || !cashMethodId) {
		showToast("All fields are required", "error");
		return;
	}

	// Validate budget against available limit
	if (budget > availableLimit) {
		showToast(
			`Request amount exceeds your available limit of ₱${availableLimit.toLocaleString(
				undefined,
				{ minimumFractionDigits: 2, maximumFractionDigits: 2 }
			)}`,
			"error"
		);
		return;
	}

	// Prepare request data
	const now = new Date();
	const phTime = new Date(
		now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
	);
	const pad = (n) => n.toString().padStart(2, "0");
	const phDateTime = `${phTime.getFullYear()}-${pad(
		phTime.getMonth() + 1
	)}-${pad(phTime.getDate())} ${pad(phTime.getHours())}:${pad(
		phTime.getMinutes()
	)}:${pad(phTime.getSeconds())}`;
	const requestData = {
		userId: user.user_id,
		purpose: purpose,
		desc: desc,
		budget: budget,
		cashMethodId: cashMethodId,
		datetime: phDateTime,
	};

	// Create form data
	const formData = new FormData();
	formData.append("operation", "addRequestCash");
	formData.append("json", JSON.stringify(requestData));

	// Show loading state
	const submitButton = document.querySelector(
		'#requestForm button[type="submit"]'
	);
	const originalText = submitButton.innerHTML;
	submitButton.innerHTML =
		'<i class="fas fa-spinner fa-spin"></i> Submitting...';
	submitButton.disabled = true;

	// Submit the request
	axios
		.post("http://localhost/cashAdvancedSystem/php/employee.php", formData)
		.then((response) => {
			if (response.data.success) {
				showToast("Request submitted successfully", "success");
				closeRequestModal();
				loadRequestHistory(); // Reload the requests
				loadUserAvailableLimit(); // Reload available limit
			} else {
				showToast(response.data.error || "Failed to submit request", "error");
			}
		})
		.catch((error) => {
			console.error("Error submitting request:", error);
			showToast("An error occurred while submitting your request", "error");
		})
		.finally(() => {
			// Reset button state
			submitButton.innerHTML = originalText;
			submitButton.disabled = false;
		});
}

// Toast utility
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
			const rawDate = req.reqS_datetime ? req.reqS_datetime.toLowerCase() : "";
			const formattedDate = new Date(req.reqS_datetime)
				.toLocaleString("en-PH", {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					hour12: true,
					timeZone: "Asia/Manila",
				})
				.toLowerCase();

			return (
				purpose.includes(search) ||
				desc.includes(search) ||
				budget.includes(search) ||
				rawDate.includes(search) ||
				formattedDate.includes(search)
			);
		});
	}

	populateRequestTable(filtered);
	updateDashboardStats(filtered);
}

function cancelRequestHandler(requestId) {
	const user = getSecureSession("user");
	if (!user) {
		showToast("You must be logged in to cancel a request", "error");
		return;
	}
	if (!confirm("Are you sure you want to cancel this request?")) return;
	const formData = new FormData();
	formData.append("operation", "cancelRequest");
	formData.append(
		"json",
		JSON.stringify({ requestId: requestId, userId: user.user_id })
	);
	axios
		.post("http://localhost/cashAdvancedSystem/php/employee.php", formData)
		.then((response) => {
			if (response.data && response.data.success) {
				showToast("Request cancelled successfully", "success");
				loadRequestHistory();
				loadUserAvailableLimit();
			} else {
				showToast(response.data.error || "Failed to cancel request", "error");
			}
		})
		.catch((error) => {
			console.error("Error cancelling request:", error);
			showToast("An error occurred while cancelling your request", "error");
		});
}

function editRequestHandler(requestId) {
	const user = getSecureSession("user");
	if (!user) {
		showToast("You must be logged in to edit a request", "error");
		return;
	}
	const request = allRequests.find(
		(r) => String(r.req_id) === String(requestId)
	);
	if (!request) {
		showToast("Request not found", "error");
		return;
	}
	// Get cash methods from session storage
	const cashMethods = getSecureSession("cashMethods") || [];
	const cashMethodOptions = cashMethods
		.map(
			(method) =>
				`<option value="${method.cashM_id}" ${
					method.cashM_id == request.req_cashMethodId ? "selected" : ""
				}>${method.cashM_name}</option>`
		)
		.join("");
	// Create and show edit modal
	let modal = document.getElementById("editRequestModal");
	if (modal) modal.remove();
	modal = document.createElement("div");
	modal.id = "editRequestModal";
	modal.className =
		"fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center";
	modal.innerHTML = `
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 overflow-hidden">
			<div class="bg-primary p-4 text-white flex justify-between items-center">
				<h3 class="text-lg font-semibold">Edit Cash Advance Request</h3>
				<button id="closeEditModal" class="text-white hover:text-gray-200">
					<i class="fas fa-times"></i>
				</button>
			</div>
			<form id="editRequestForm" class="p-6">
				<div class="mb-4">
					<label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" for="editPurpose">
						Purpose
					</label>
					<input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
						id="editPurpose" type="text" value="${request.req_purpose}" required>
				</div>
				<div class="mb-4">
					<label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" for="editDesc">
						Description
					</label>
					<input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
						id="editDesc" type="text" value="${request.req_desc || ""}">
				</div>
				<div class="mb-4">
					<label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" for="editBudget">
						Amount (₱)
					</label>
					<input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
						id="editBudget" type="number" value="${request.req_budget}" min="1" required>
				</div>
				<div class="mb-6">
					<label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" for="editCashMethodId">
						Cash Method
					</label>
					<select class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
						id="editCashMethodId" required>
						${cashMethodOptions}
					</select>
				</div>
				<div class="flex items-center justify-between">
					<button class="bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" 
						type="submit">
						Save Changes
					</button>
				</div>
			</form>
		</div>
	`;
	document.body.appendChild(modal);
	document.getElementById("closeEditModal").onclick = () => modal.remove();
	document.getElementById("editRequestForm").onsubmit = function (e) {
		e.preventDefault();
		const purpose = document.getElementById("editPurpose").value;
		const desc = document.getElementById("editDesc").value;
		const budget = Number(document.getElementById("editBudget").value);
		const cashMethodId = document.getElementById("editCashMethodId").value;

		// Get available limit from session
		const availableLimit = Number(getSecureSession("availableLimit") || 0);

		// Validation
		if (!purpose || !budget || !cashMethodId) {
			showToast("All fields are required", "error");
			return;
		}

		// Validate budget against available limit
		if (budget > availableLimit) {
			showToast(
				`Request amount exceeds your available limit of ₱${availableLimit.toLocaleString(
					undefined,
					{ minimumFractionDigits: 2, maximumFractionDigits: 2 }
				)}`,
				"error"
			);
			return;
		}

		const formData = new FormData();
		formData.append("operation", "editRequest");
		formData.append(
			"json",
			JSON.stringify({
				requestId: request.req_id,
				userId: user.user_id,
				purpose,
				desc,
				budget,
				cashMethodId,
			})
		);
		axios
			.post("http://localhost/cashAdvancedSystem/php/employee.php", formData)
			.then((response) => {
				if (response.data && response.data.success) {
					showToast("Request updated successfully", "success");
					modal.remove();
					loadRequestHistory();
					loadUserAvailableLimit();
				} else {
					showToast(response.data.error || "Failed to update request", "error");
				}
			})
			.catch((error) => {
				console.error("Error updating request:", error);
				showToast("An error occurred while updating your request", "error");
			});
	};
}