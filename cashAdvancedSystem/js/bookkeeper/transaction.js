let allTransactions = []; // Store all fetched transactions
let currentFilteredTransactions = []; // Store currently filtered transactions for printing

document.addEventListener("DOMContentLoaded", function () {
	setupEventListeners();
	fetchTransactions();
});

const API_URL = "http://localhost/cashAdvancedSystem/php/bookkeeper.php"; // Adjusted path

function setupEventListeners() {
	const dateFilter = document.getElementById("dateFilter");
	const startDate = document.getElementById("startDate");
	const endDate = document.getElementById("endDate");
	const searchInput = document.getElementById("searchInput");
	const printButton = document.getElementById("printButton");
	const customDateRange = document.getElementById("customDateRange");

	if (dateFilter) {
		dateFilter.addEventListener("change", function () {
			if (customDateRange) {
				customDateRange.classList.toggle("hidden", this.value !== "custom");
			}
			applyFiltersAndRender();
		});
	}
	if (startDate) startDate.addEventListener("change", applyFiltersAndRender);
	if (endDate) endDate.addEventListener("change", applyFiltersAndRender);
	if (searchInput) {
		// Use 'input' for instant filtering as user types
		searchInput.addEventListener("input", debounce(applyFiltersAndRender, 300));
	}
	if (printButton) printButton.addEventListener("click", printTransactions);
}

// Debounce function to limit how often filtering runs during typing
function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

async function fetchTransactions() {
	const cardsContainer = document.getElementById("transactionCardsContainer");
	const loadingIndicator = document.getElementById("loadingTransactions");

	if (!cardsContainer || !loadingIndicator) {
		console.error(
			"Required elements 'transactionCardsContainer' or 'loadingTransactions' not found."
		);
		return;
	}

	// Show loading indicator
	loadingIndicator.style.display = "block";
	cardsContainer.innerHTML = ""; // Clear previous cards

	const formData = new FormData();
	formData.append("operation", "getTransactionHistory");

	try {
		const response = await axios.post(API_URL, formData);
		let transactions = response.data;

		if (typeof transactions === "string") {
			try {
				transactions = JSON.parse(transactions);
			} catch (e) {
				console.error("Error parsing transactions JSON:", e);
				showToast("Error parsing transaction data.", "error");
				transactions = [];
			}
		}

		if (!Array.isArray(transactions)) {
			console.error("Transactions data is not an array:", transactions);
			showToast("Received invalid transaction data format.", "error");
			allTransactions = []; // Ensure it's an array even on error
		} else {
			allTransactions = transactions; // Store fetched data
		}
		// Hide loading indicator before rendering
		loadingIndicator.style.display = "none";
		// Apply initial filters (default is 'all') and render
		applyFiltersAndRender();
	} catch (error) {
		console.error("Error fetching transactions:", error);
		showToast(
			"Could not fetch transaction history. Please try again.",
			"error"
		);
		if (cardsContainer && loadingIndicator) {
			// Check again
			loadingIndicator.style.display = "none";
			cardsContainer.innerHTML = `<div class="text-center text-red-500 dark:text-red-400 py-8">Failed to load transaction history.</div>`;
		}
	}
}

function applyFiltersAndRender() {
	let filtered = [...allTransactions];

	// Date filter
	const dateFilter = document.getElementById("dateFilter")?.value;
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
		end = new Date(now.setDate(first + 6)); // Use current date obj
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
		const startDateVal = document.getElementById("startDate")?.value;
		const endDateVal = document.getElementById("endDate")?.value;
		if (startDateVal && endDateVal) {
			start = new Date(startDateVal + "T00:00:00");
			end = new Date(endDateVal + "T23:59:59");
		}
	}

	if (start && end) {
		// Apply date filter only if start and end are valid
		filtered = filtered.filter((tx) => {
			if (!tx.reqS_datetime) return false;
			try {
				const txDate = new Date(tx.reqS_datetime);
				return txDate >= start && txDate <= end;
			} catch (e) {
				console.warn("Invalid date for filtering:", tx.reqS_datetime);
				return false;
			}
		});
	}

	// Search filter
	const search = document
		.getElementById("searchInput")
		?.value.trim()
		.toLowerCase();
	if (search) {
		filtered = filtered.filter((tx) => {
			const bookkeeperName = `${tx.bookkeeper_firstname || ""} ${
				tx.bookkeeper_lastname || ""
			}`.toLowerCase();
			const employeeName = `${tx.employee_firstname || ""} ${
				tx.employee_lastname || ""
			}`.toLowerCase();
			const purpose = (tx.req_purpose || "").toLowerCase();
			const desc = (tx.req_desc || "").toLowerCase();
			const amount = (tx.req_budget || "").toString();
			const cashMethod = (tx.cashM_name || "").toLowerCase();

			return (
				bookkeeperName.includes(search) ||
				employeeName.includes(search) ||
				purpose.includes(search) ||
				desc.includes(search) ||
				amount.includes(search) ||
				cashMethod.includes(search)
			);
		});
	}

	currentFilteredTransactions = filtered; // Store for printing
	renderTransactions(filtered);
}

function renderTransactions(transactions) {
	const cardsContainer = document.getElementById("transactionCardsContainer");
	const loadingIndicator = document.getElementById("loadingTransactions");

	if (!cardsContainer) return;
	if (loadingIndicator) loadingIndicator.style.display = "none"; // Ensure loading is hidden

	cardsContainer.innerHTML = ""; // Clear previous content

	if (transactions.length === 0) {
		cardsContainer.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400 py-8">No transaction history found.</div>`;
		return;
	}

	transactions.forEach((tx) => {
		const card = document.createElement("div");
		card.className =
			"bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-5 transition-all hover:shadow-lg";

		const formattedBudget = `₱${Number(tx.req_budget || 0).toLocaleString(
			undefined,
			{ minimumFractionDigits: 2, maximumFractionDigits: 2 }
		)}`;
		const formattedDate = tx.reqS_datetime
			? formatDate(tx.reqS_datetime)
			: "N/A";
		const statusColor = getStatusColor(tx.statusR_name);
		const statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-medium border ${statusColor}">${
			tx.statusR_name || "N/A"
		}</span>`;
		const description = tx.req_desc
			? tx.req_desc.replace(/\n/g, "<br>")
			: "No description provided.";

		// Add a class for print styling
		card.classList.add("transaction-card-print");

		card.innerHTML = `
			<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
				<h3 class="text-lg font-semibold text-primary dark:text-secondary mb-1 sm:mb-0">${
					tx.req_purpose || "Transaction"
				}</h3>
				${statusBadge}
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
				<div class="flex items-center">
					<i class="fas fa-calendar-alt fa-fw mr-2 text-gray-400 dark:text-gray-500"></i>
					<strong>Date:</strong>&nbsp;<span>${formattedDate}</span>
				</div>
				<div class="flex items-center">
					<i class="fas fa-coins fa-fw mr-2 text-gray-400 dark:text-gray-500"></i>
					<strong>Amount:</strong>&nbsp;<span class="font-semibold text-green-600 dark:text-green-400">${formattedBudget}</span>
				</div>
				<div class="flex items-center">
					<i class="fas fa-user-tie fa-fw mr-2 text-gray-400 dark:text-gray-500"></i>
					<strong>Bookkeeper:</strong>&nbsp;<span>${tx.bookkeeper_firstname || ""} ${
			tx.bookkeeper_lastname || ""
		}</span>
				</div>
				<div class="flex items-center">
					<i class="fas fa-user fa-fw mr-2 text-gray-400 dark:text-gray-500"></i>
					<strong>Employee:</strong>&nbsp;<span>${tx.employee_firstname || ""} ${
			tx.employee_lastname || ""
		}</span>
				</div>
				 <div class="flex items-center">
					<i class="fas fa-credit-card fa-fw mr-2 text-gray-400 dark:text-gray-500"></i>
					<strong>Cash Method:</strong>&nbsp;<span>${tx.cashM_name || "N/A"}</span>
				</div>
			</div>

			<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
				<h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Description:</h4>
				<p class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">${description}</p>
			</div>
		`;
		cardsContainer.appendChild(card);
	});
}

// Helper function to format date (similar to admin/cashAdvance.js)
function formatDate(dateString) {
	if (!dateString) return "N/A";
	try {
		const date = new Date(dateString);
		return date.toLocaleString("en-PH", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch (e) {
		console.warn("Could not format date:", dateString, e);
		return dateString; // Return original if formatting fails
	}
}

// Helper function for status colors (similar to admin/cashAdvance.js, ensure it's appropriate here)
function getStatusColor(status) {
	if (!status)
		return "border-gray-300 bg-gray-50 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300";
	switch (status.toLowerCase()) {
		case "pending":
			return "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-700/30 dark:text-yellow-300";
		case "approved":
			return "border-green-300 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-700/30 dark:text-green-300";
		case "rejected":
			return "border-red-300 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-700/30 dark:text-red-300";
		case "completed":
			return "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-700/30 dark:text-blue-300";
		default:
			return "border-gray-300 bg-gray-50 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300";
	}
}

function printTransactions() {
	// Optional: Add specific print preparation if needed beyond CSS, e.g., adding a title
	const printTitle = "Bookkeeper Transaction History";
	const dateRange = getPrintDateRange();
	const header = document.createElement("div");
	header.className = "print-header text-center mb-4";
	header.innerHTML = `<h2>${printTitle}</h2><p class='text-sm text-gray-600'>${dateRange}</p>`;

	// Add header to the section that will be printed (adjust selector if needed)
	const sectionToPrint = document.getElementById("transactionSection");
	if (sectionToPrint) {
		sectionToPrint.insertBefore(header, sectionToPrint.firstChild);
	}

	window.print();

	// Clean up the header after printing
	if (sectionToPrint && header.parentNode === sectionToPrint) {
		sectionToPrint.removeChild(header);
	}
}

function getPrintDateRange() {
	const dateFilter = document.getElementById("dateFilter")?.value;
	let rangeStr = "All Time";

	if (dateFilter === "today") {
		rangeStr = `Date: ${formatDateSimple(new Date())}`;
	} else if (dateFilter === "week") {
		const now = new Date();
		const first = now.getDate() - now.getDay();
		const start = new Date(now.setDate(first));
		const end = new Date(now.setDate(first + 6));
		rangeStr = `Week: ${formatDateSimple(start)} - ${formatDateSimple(end)}`;
	} else if (dateFilter === "month") {
		const today = new Date();
		const start = new Date(today.getFullYear(), today.getMonth(), 1);
		const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
		rangeStr = `Month: ${start.toLocaleString("en-PH", {
			month: "long",
			year: "numeric",
		})}`;
	} else if (dateFilter === "custom") {
		const startDateVal = document.getElementById("startDate")?.value;
		const endDateVal = document.getElementById("endDate")?.value;
		if (startDateVal && endDateVal) {
			try {
				const start = new Date(startDateVal + "T00:00:00");
				const end = new Date(endDateVal + "T00:00:00");
				rangeStr = `Custom Range: ${formatDateSimple(
					start
				)} - ${formatDateSimple(end)}`;
			} catch (e) {
				rangeStr = "Custom Range (Invalid Dates)";
			}
		}
	}
	return rangeStr;
}

// Simple date formatter for print header
function formatDateSimple(date) {
	if (!date) return "";
	return date.toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

// Toast Notification Function
function showToast(message, type = "success") {
	const toast = document.getElementById("toast");
	const toastMessage = document.getElementById("toastMessage");
	const icon = toast ? toast.querySelector("i") : null;

	if (!toast || !toastMessage || !icon) {
		console.warn("Toast elements not found. Message:", message);
		return;
	}

	toastMessage.textContent = message;

	// Reset classes
	toast.className =
		"fixed bottom-6 right-6 z-[9999] min-w-[250px] max-w-xs rounded-lg shadow-2xl px-5 py-4 flex items-center space-x-3 transition-all duration-300 transform translate-y-full opacity-0";
	icon.className = "fas text-xl"; // Base icon class

	// Type-specific styles
	if (type === "success") {
		toast.classList.add("bg-green-500", "text-white");
		icon.classList.add("fa-check-circle");
	} else if (type === "error") {
		toast.classList.add("bg-red-600", "text-white");
		icon.classList.add("fa-times-circle");
	} else {
		toast.classList.add("bg-blue-500", "text-white");
		icon.classList.add("fa-info-circle");
	}

	// Show toast with animation
	toast.classList.remove("hidden");
	setTimeout(() => {
		toast.classList.remove("translate-y-full", "opacity-0");
		toast.classList.add("translate-y-0", "opacity-100");
	}, 10);

	// Hide after 3 seconds with animation
	setTimeout(() => {
		toast.classList.remove("translate-y-0", "opacity-100");
		toast.classList.add("translate-y-full", "opacity-0");
		setTimeout(() => {
			toast.classList.add("hidden");
		}, 300);
	}, 3000);
}
