// Year-End Financial Summary JS
let yearlyRequests = [];
let monthlyTotalsChart = null;
let topWorkersChart = null;
let disbursedVsBudgetedChart = null;

document.addEventListener("DOMContentLoaded", function () {
	console.log("Yearly Summary: DOM Content Loaded");
	initYearSelector();
	fetchYearlyData();
});

function initYearSelector() {
	console.log("Yearly Summary: Initializing year selector");
	const yearSelector = document.getElementById("yearSelector");

	if (!yearSelector) {
		console.error("Yearly Summary: Year selector element not found!");
		return;
	}

	// Clear existing options
	yearSelector.innerHTML = "";

	// Add options for last 5 years
	const currentYear = new Date().getFullYear();
	for (let y = currentYear; y >= currentYear - 5; y--) {
		const opt = document.createElement("option");
		opt.value = y;
		opt.textContent = y;
		yearSelector.appendChild(opt);
	}

	// Set current year as default
	yearSelector.value = currentYear;

	// Add event listener for year selection
	yearSelector.addEventListener("change", function () {
		console.log("Yearly Summary: Year changed to", this.value);
		renderYearlySummary();
	});

	console.log("Yearly Summary: Year selector initialized with options");
}

function fetchYearlyData() {
	console.log("Yearly Summary: Fetching data");

	try {
		const formData = new FormData();
		formData.append("operation", "getAllRequestStatusHistory");

		axios
			.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
			.then((response) => {
				console.log("Yearly Summary: Data fetched successfully");
				let requests = response.data;
				console.log("Yearly Summary: Raw response data type:", typeof requests);

				if (typeof requests === "string") {
					try {
						requests = JSON.parse(requests);
						console.log("Yearly Summary: Successfully parsed JSON data");
					} catch (e) {
						console.error("Yearly Summary: Error parsing requests:", e);
						requests = [];
					}
				}

				if (Array.isArray(requests) && requests.length > 0) {
					console.log(`Yearly Summary: Got ${requests.length} request records`);
					yearlyRequests = requests;
				} else {
					console.warn(
						"Yearly Summary: No data received, generating test data"
					);
					yearlyRequests = generateTestData();
				}

				renderYearlySummary();
			})
			.catch((error) => {
				console.error("Yearly Summary: Error fetching yearly data:", error);
				console.warn("Yearly Summary: Using test data due to fetch error");
				yearlyRequests = generateTestData();
				renderYearlySummary();
			});
	} catch (error) {
		console.error(
			"Yearly Summary: Unexpected error in fetchYearlyData:",
			error
		);
		yearlyRequests = generateTestData();
		renderYearlySummary();
	}
}

function generateTestData() {
	console.log("Yearly Summary: Generating test data");
	const currentYear = new Date().getFullYear();
	const testData = [];

	// Names for test data
	const employees = [
		{ firstName: "John", lastName: "Doe" },
		{ firstName: "Jane", lastName: "Smith" },
		{ firstName: "Robert", lastName: "Johnson" },
		{ firstName: "Maria", lastName: "Garcia" },
		{ firstName: "David", lastName: "Brown" },
	];

	// Statuses
	const statuses = ["pending", "approved", "completed", "rejected"];

	// Generate data for the last 2 years
	for (let y = currentYear; y >= currentYear - 1; y--) {
		// For each employee
		employees.forEach((emp, empIndex) => {
			// Generate 5-10 requests per employee per year
			const numRequests = 5 + Math.floor(Math.random() * 6);

			for (let r = 0; r < numRequests; r++) {
				// Random month and day
				const month = Math.floor(Math.random() * 12);
				const day = 1 + Math.floor(Math.random() * 28);
				const reqId = `TEST-${y}-${empIndex}-${r}`;

				// Random budget between 1000 and 10000
				const budget = 1000 + Math.floor(Math.random() * 9000);

				// Create entries for this request with status history
				let numStatusChanges = 1 + Math.floor(Math.random() * 3); // 1-3 status changes

				// Ensure we don't exceed the number of statuses
				numStatusChanges = Math.min(numStatusChanges, statuses.length);

				for (let s = 0; s < numStatusChanges; s++) {
					// Each status change happens a few days after the previous
					const statusDay = day + s * 2;
					const statusDate = new Date(y, month, statusDay);

					testData.push({
						req_id: reqId,
						user_firstname: emp.firstName,
						user_lastname: emp.lastName,
						req_budget: budget.toString(),
						reqS_datetime: statusDate.toISOString(),
						statusR_name: statuses[s], // Status progresses through the array
					});
				}
			}
		});
	}

	console.log(`Yearly Summary: Generated ${testData.length} test records`);
	return testData;
}

function renderYearlySummary() {
	const yearSelector = document.getElementById("yearSelector");
	if (!yearSelector) {
		console.error(
			"Yearly Summary: Year selector not found when rendering summary"
		);
		return;
	}

	const year = parseInt(yearSelector.value);
	console.log(`Yearly Summary: Rendering summary for year ${year}`);

	if (!Array.isArray(yearlyRequests) || yearlyRequests.length === 0) {
		console.warn("Yearly Summary: No request data available");
		// Still update UI with zeros
		updateYearlySummaryCards([]);
		// Render empty charts
		renderEmptyCharts();
		return;
	}

	// Filter for selected year
	const yearRequests = yearlyRequests.filter((req) => {
		try {
			const d = new Date(req.reqS_datetime);
			return d.getFullYear() === year;
		} catch (e) {
			console.error("Yearly Summary: Error parsing date", req.reqS_datetime, e);
			return false;
		}
	});

	console.log(
		`Yearly Summary: Found ${yearRequests.length} requests for year ${year}`
	);

	// Update summary cards
	updateYearlySummaryCards(yearRequests);

	// Render charts
	if (yearRequests.length > 0) {
		renderMonthlyTotals(yearRequests, year);
		renderTopWorkers(yearRequests);
		renderDisbursedVsBudgeted(yearRequests);
	} else {
		renderEmptyCharts();
	}
}

function renderEmptyCharts() {
	console.log("Yearly Summary: Rendering empty charts");
	// Create empty charts
	renderMonthlyTotals([], new Date().getFullYear());
	renderTopWorkers([]);
	renderDisbursedVsBudgeted([]);
}

function updateYearlySummaryCards(yearRequests) {
	console.log("Yearly Summary: Updating summary cards");

	// Create a map to store latest status for each request
	const requestMap = new Map();

	yearRequests.forEach((req) => {
		const reqId = req.req_id;

		// If this request doesn't exist in map, or is newer than existing one, update it
		if (
			!requestMap.has(reqId) ||
			new Date(req.reqS_datetime) >
				new Date(requestMap.get(reqId).reqS_datetime)
		) {
			requestMap.set(reqId, req);
		}
	});

	// Get unique request count
	const totalRequests = requestMap.size;

	// Count completed requests
	let completedCount = 0;
	let totalDisbursed = 0;

	requestMap.forEach((req) => {
		if (req.statusR_name.toLowerCase() === "completed") {
			completedCount++;
			totalDisbursed += Number(req.req_budget || 0);
		}
	});

	// Update UI
	const totalRequestsElement = document.getElementById("yearlyTotalRequests");
	const completedRequestsElement = document.getElementById(
		"yearlyCompletedRequests"
	);
	const totalDisbursedElement = document.getElementById("yearlyTotalDisbursed");

	if (totalRequestsElement) totalRequestsElement.textContent = totalRequests;
	if (completedRequestsElement)
		completedRequestsElement.textContent = completedCount;
	if (totalDisbursedElement)
		totalDisbursedElement.textContent = `₱${totalDisbursed.toLocaleString()}`;

	console.log("Yearly Summary: Summary cards updated", {
		totalRequests,
		completedCount,
		totalDisbursed,
	});
}

function renderMonthlyTotals(yearRequests, year) {
	console.log("Yearly Summary: Rendering monthly totals chart for year", year);
	const monthlyTotalsCtx = document
		.getElementById("monthlyTotalsChart")
		?.getContext("2d");

	if (!monthlyTotalsCtx) {
		console.error(
			"Yearly Summary: Monthly totals chart canvas element not found!"
		);
		return;
	}

	if (monthlyTotalsChart) {
		monthlyTotalsChart.destroy();
		console.log("Yearly Summary: Destroyed existing monthly totals chart");
	}

	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];

	// Initialize data for each month
	const monthlyData = months.map(() => ({
		totalRequests: 0,
		approved: 0,
		completed: 0,
		disbursed: 0,
		// Use sets to count unique requests for counts
		_totalReqSet: new Set(),
		_approvedReqSet: new Set(),
		_completedReqSet: new Set(),
	}));

	if (Array.isArray(yearRequests)) {
		yearRequests.forEach((req) => {
			try {
				const reqDate = new Date(req.reqS_datetime);
				const monthIndex = reqDate.getMonth(); // 0-11

				if (monthIndex >= 0 && monthIndex < 12) {
					const status = req.statusR_name ? req.statusR_name.toLowerCase() : "";

					// Count unique request IDs for totals, approved, and completed
					monthlyData[monthIndex]._totalReqSet.add(req.req_id);

					if (status === "approved") {
						monthlyData[monthIndex]._approvedReqSet.add(req.req_id);
					}
					if (status === "completed") {
						monthlyData[monthIndex]._completedReqSet.add(req.req_id);
						monthlyData[monthIndex].disbursed += Number(req.req_budget || 0);
					}
				}
			} catch (e) {
				console.error(
					"Yearly Summary: Error processing request date for monthly totals",
					req.reqS_datetime,
					e
				);
			}
		});
	}

	// Finalize counts from sets
	monthlyData.forEach((month) => {
		month.totalRequests = month._totalReqSet.size;
		month.approved = month._approvedReqSet.size;
		month.completed = month._completedReqSet.size;
	});

	const chartData = {
		labels: months,
		datasets: [
			{
				label: "Total Requests",
				data: monthlyData.map((d) => d.totalRequests),
				backgroundColor: "rgba(139, 28, 35, 0.7)", // Primary dark red
				borderColor: "rgba(139, 28, 35, 1)",
				borderWidth: 1,
				yAxisID: "yRequests",
				type: "bar",
			},
			{
				label: "Approved",
				data: monthlyData.map((d) => d.approved),
				backgroundColor: "rgba(34, 197, 94, 0.7)", // Green
				borderColor: "rgba(34, 197, 94, 1)",
				borderWidth: 1,
				yAxisID: "yRequests",
				type: "bar",
			},
			{
				label: "Completed",
				data: monthlyData.map((d) => d.completed),
				backgroundColor: "rgba(59, 130, 246, 0.7)", // Blue
				borderColor: "rgba(59, 130, 246, 1)",
				borderWidth: 1,
				yAxisID: "yRequests",
				type: "bar",
			},
			{
				label: "Disbursed (₱)",
				data: monthlyData.map((d) => d.disbursed),
				backgroundColor: "rgba(255, 159, 64, 0.7)", // Orange
				borderColor: "rgba(255, 159, 64, 1)",
				borderWidth: 2,
				yAxisID: "yDisbursed",
				type: "line", // Changed to line for differentiation
				fill: false,
				tension: 0.1,
				pointRadius: 5,
				pointHoverRadius: 7,
			},
		],
	};

	monthlyTotalsChart = new Chart(monthlyTotalsCtx, {
		// Type is defined per dataset now
		data: chartData,
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index",
				intersect: false,
			},
			stacked: false, // Keep false for combo chart
			plugins: {
				legend: {
					position: "top",
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							let label = context.dataset.label || "";
							if (label) {
								label += ": ";
							}
							if (context.parsed.y !== null) {
								if (context.dataset.yAxisID === "yDisbursed") {
									label += new Intl.NumberFormat("en-PH", {
										style: "currency",
										currency: "PHP",
									}).format(context.parsed.y);
								} else {
									label += context.parsed.y;
								}
							}
							return label;
						},
					},
				},
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Month",
					},
				},
				yRequests: {
					// Left Y-axis for counts
					type: "linear",
					display: true,
					position: "left",
					title: {
						display: true,
						text: "Count",
					},
					ticks: {
						precision: 0, // Ensure whole numbers for counts
					},
					grid: {
						drawOnChartArea: false, // Only draw grid for this axis if needed, or remove if too cluttered
					},
				},
				yDisbursed: {
					// Right Y-axis for disbursed amount
					type: "linear",
					display: true,
					position: "right",
					title: {
						display: true,
						text: "Disbursed (₱)",
					},
					ticks: {
						callback: function (value, index, values) {
							return new Intl.NumberFormat("en-PH", {
								style: "currency",
								currency: "PHP",
								minimumFractionDigits: 0,
								maximumFractionDigits: 0,
							}).format(value);
						},
					},
					// Ensuring grid lines from this axis don't overlap with the primary one
					grid: {
						drawOnChartArea: true, // Show grid lines for this axis
						// color: 'rgba(0,0,0,0.05)', // Lighter color for secondary grid if needed
					},
				},
			},
		},
	});
	console.log("Yearly Summary: Monthly totals chart rendered");

	// Render details table below the chart
	const detailsContainer = document.getElementById("monthlyTotalsDetails");
	if (detailsContainer) {
		let tableHtml = `
			<div class="overflow-x-auto max-h-72 overflow-y-auto mt-4">
				<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow">
					<thead class="bg-gray-50 dark:bg-gray-700">
						<tr>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Requests</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Approved</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Completed</th>
							<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Disbursed (₱)</th>
						</tr>
					</thead>
					<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
		`;
		months.forEach((month, i) => {
			tableHtml += `
				<tr>
					<td class="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">${month}</td>
					<td class="px-4 py-2 text-gray-600 dark:text-gray-300">${
						monthlyData[i].totalRequests
					}</td>
					<td class="px-4 py-2 text-green-600 dark:text-green-400">${
						monthlyData[i].approved
					}</td>
					<td class="px-4 py-2 text-blue-600 dark:text-blue-400">${
						monthlyData[i].completed
					}</td>
					<td class="px-4 py-2 text-yellow-700 dark:text-yellow-400">₱${monthlyData[
						i
					].disbursed.toLocaleString()}</td>
				</tr>
			`;
		});
		// Add total row
		const totalRequestsSum = monthlyData.reduce(
			(sum, d) => sum + d.totalRequests,
			0
		);
		const approvedSum = monthlyData.reduce((sum, d) => sum + d.approved, 0);
		const completedSum = monthlyData.reduce((sum, d) => sum + d.completed, 0);
		const disbursedSum = monthlyData.reduce((sum, d) => sum + d.disbursed, 0);
		tableHtml += `
			<tr class="bg-gray-100 dark:bg-gray-700 font-bold sticky bottom-0 z-10">
				<td class="px-4 py-2 text-gray-900 dark:text-gray-100">Total</td>
				<td class="px-4 py-2 text-gray-900 dark:text-gray-100">${totalRequestsSum}</td>
				<td class="px-4 py-2 text-green-700 dark:text-green-300">${approvedSum}</td>
				<td class="px-4 py-2 text-blue-700 dark:text-blue-300">${completedSum}</td>
				<td class="px-4 py-2 text-yellow-900 dark:text-yellow-200">₱${disbursedSum.toLocaleString()}</td>
			</tr>
		`;
		tableHtml += `
					</tbody>
				</table>
			</div>
		`;
		detailsContainer.innerHTML = tableHtml;
	}
}

function renderTopWorkers(yearRequests) {
	console.log("Yearly Summary: Rendering top workers chart");
	const chartContainer = document.getElementById("topWorkersChart");
	if (!chartContainer) {
		console.error("Yearly Summary: Top workers chart container not found");
		return;
	}

	// Get latest status for each request
	const requestMap = new Map();
	yearRequests.forEach((req) => {
		const reqId = req.req_id;
		if (
			!requestMap.has(reqId) ||
			new Date(req.reqS_datetime) >
				new Date(requestMap.get(reqId).reqS_datetime)
		) {
			requestMap.set(reqId, req);
		}
	});

	// Group by worker
	const workerMap = {};

	requestMap.forEach((req) => {
		const key = `${req.user_firstname || "Unknown"} ${
			req.user_lastname || ""
		}`.trim();

		if (!workerMap[key]) {
			workerMap[key] = { count: 0, disbursed: 0 };
		}

		workerMap[key].count++;

		if (req.statusR_name.toLowerCase() === "completed") {
			workerMap[key].disbursed += Number(req.req_budget || 0);
		}
	});

	// Sort and get top 5
	const topWorkers = Object.entries(workerMap)
		.map(([name, data]) => ({ name, ...data }))
		.sort((a, b) => b.count - a.count) // Sort by count instead of disbursed
		.slice(0, 5);

	console.log("Yearly Summary: Top workers data", topWorkers);

	// Handle empty data case
	if (topWorkers.length === 0) {
		topWorkers.push({
			name: "No Data",
			count: 0,
			disbursed: 0,
		});
	}

	// Destroy existing chart
	if (topWorkersChart) {
		topWorkersChart.destroy();
	}

	// Create new chart
	topWorkersChart = new Chart(chartContainer.getContext("2d"), {
		type: "bar",
		data: {
			labels: topWorkers.map((w) => w.name),
			datasets: [
				{
					label: "Total Requests",
					data: topWorkers.map((w) => w.count),
					backgroundColor: "#8B1C23",
					barPercentage: 0.7,
					categoryPercentage: 0.6,
				},
				{
					label: "Disbursed (₱)",
					data: topWorkers.map((w) => w.disbursed),
					backgroundColor: "#22C55E",
					barPercentage: 0.7,
					categoryPercentage: 0.6,
					yAxisID: "y1", // Assign to secondary y-axis for vertical chart
				},
			],
		},
		options: {
			maintainAspectRatio: false,
			responsive: true,
			plugins: {
				legend: { position: "top" },
				tooltip: {
					callbacks: {
						label: function (context) {
							// Check if using secondary y-axis
							if (context.dataset.yAxisID === "y1") {
								return `${
									context.dataset.label
								}: ₱${context.raw.toLocaleString()}`;
							}
							return `${context.dataset.label}: ${context.raw}`;
						},
					},
				},
			},
			scales: {
				x: {
					// X-axis is now the category axis (Worker Names)
					title: {
						display: true,
						text: "Top Workers",
					},
				},
				y: {
					// Primary Y-axis (for Total Requests)
					position: "left",
					beginAtZero: true,
					title: {
						display: true,
						text: "Number of Requests",
					},
					ticks: {
						stepSize: 1,
						precision: 0,
					},
				},
				y1: {
					// Secondary Y-axis (for Disbursed ₱)
					type: "linear",
					position: "right",
					beginAtZero: true,
					title: {
						display: true,
						text: "Disbursed (₱)",
					},
					grid: {
						drawOnChartArea: false, // Don't draw grid lines for this axis on the chart area
					},
				},
			},
		},
	});

	console.log("Yearly Summary: Top workers chart rendered");
}

function renderDisbursedVsBudgeted(yearRequests) {
	console.log("Yearly Summary: Rendering disbursed vs budgeted chart");
	const chartContainer = document.getElementById("disbursedVsBudgetedChart");
	if (!chartContainer) {
		console.error(
			"Yearly Summary: Disbursed vs budgeted chart container not found"
		);
		return;
	}

	// Get latest status for each request
	const requestMap = new Map();
	yearRequests.forEach((req) => {
		const reqId = req.req_id;
		if (
			!requestMap.has(reqId) ||
			new Date(req.reqS_datetime) >
				new Date(requestMap.get(reqId).reqS_datetime)
		) {
			requestMap.set(reqId, req);
		}
	});

	// Calculate totals
	let totalRequested = 0;
	let totalDisbursed = 0;
	let pendingAmount = 0;

	requestMap.forEach((req) => {
		const budget = Number(req.req_budget || 0);
		const status = req.statusR_name.toLowerCase();

		totalRequested += budget;

		if (status === "completed") {
			totalDisbursed += budget;
		} else if (status === "pending" || status === "approved") {
			pendingAmount += budget;
		}
	});

	// Calculate remaining (not requested or rejected)
	const remaining = Math.max(
		0,
		totalRequested - totalDisbursed - pendingAmount
	);

	console.log("Yearly Summary: Budget data", {
		totalRequested,
		totalDisbursed,
		pendingAmount,
		remaining,
	});

	// Destroy existing chart
	if (disbursedVsBudgetedChart) {
		disbursedVsBudgetedChart.destroy();
	}

	// Create new chart
	disbursedVsBudgetedChart = new Chart(chartContainer.getContext("2d"), {
		type: "doughnut",
		data: {
			labels: ["Disbursed", "Pending", "Remaining"],
			datasets: [
				{
					data: [totalDisbursed, pendingAmount, remaining],
					backgroundColor: ["#22C55E", "#F59E0B", "#3B82F6"],
					borderWidth: 1,
					borderColor: "#fff",
					hoverOffset: 12,
				},
			],
		},
		options: {
			maintainAspectRatio: false,
			responsive: true,
			cutout: "65%",
			plugins: {
				legend: {
					display: true,
					position: "bottom",
					labels: {
						boxWidth: 12,
						padding: 15,
					},
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							const value = context.raw;
							const total = context.dataset.data.reduce((a, b) => a + b, 0);
							const percentage = Math.round((value / (total || 1)) * 100);
							return `₱${value.toLocaleString()} (${percentage}%)`;
						},
					},
				},
			},
			animation: { animateRotate: true, duration: 1000 },
			layout: { padding: 20 },
		},
	});

	console.log("Yearly Summary: Disbursed vs budgeted chart rendered");
}
