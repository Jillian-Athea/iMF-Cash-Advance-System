let allRequests = [];
let approvedRequests = [];
let monthlyTrendChart = null;
let statusDistributionChart = null;
let employeeData = []; // Store processed employee data for sorting
let currentDetailedMonthRequests = []; // To store data for the detailed report table

document.addEventListener("DOMContentLoaded", function () {
	// Set default month to current month
	const today = new Date();
	const monthSelector = document.getElementById("monthSelector");
	monthSelector.value = `${today.getFullYear()}-${String(
		today.getMonth() + 1
	).padStart(2, "0")}`;

	// Fetch initial data
	fetchReportData();

	// Add event listener for month selection
	monthSelector.addEventListener("change", fetchReportData);

	// Add event listener for employee search
	const employeeSearchInput = document.getElementById("employeeSearchInput");
	if (employeeSearchInput) {
		employeeSearchInput.addEventListener("input", function () {
			searchEmployees(this.value.trim().toLowerCase());
		});
	}

	// Add event listener for employee sorting
	const employeeSortSelect = document.getElementById("employeeSortSelect");
	if (employeeSortSelect) {
		employeeSortSelect.addEventListener("change", function () {
			sortEmployees(this.value);
		});
	}

	// Event listeners for Detailed Monthly Report filters
	const reportSearchInput = document.getElementById("reportSearchInput");
	const reportStatusFilter = document.getElementById("reportStatusFilter");
	const reportSortSelect = document.getElementById("reportSortSelect");

	if (reportSearchInput) {
		reportSearchInput.addEventListener(
			"input",
			debounce(renderFilteredAndSortedDetailedReport, 300)
		);
	}
	if (reportStatusFilter) {
		reportStatusFilter.addEventListener(
			"change",
			renderFilteredAndSortedDetailedReport
		);
	}
	if (reportSortSelect) {
		reportSortSelect.addEventListener(
			"change",
			renderFilteredAndSortedDetailedReport
		);
	}

	// Add event listeners for new print buttons
	const printButtons = document.querySelectorAll(".print-button");
	printButtons.forEach((button) => {
		button.addEventListener("click", function () {
			const sectionId = this.dataset.sectionId;
			printReportSection(sectionId);
		});
	});
});

function fetchReportData() {
	const formData = new FormData();
	formData.append("operation", "getAllRequestStatusHistory");

	axios
		.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
		.then((response) => {
			let requests = response.data;
			if (typeof requests === "string") {
				try {
					requests = JSON.parse(requests);
				} catch (e) {
					console.error("Error parsing all requests:", e);
					requests = [];
				}
			}
			allRequests = Array.isArray(requests) ? requests : [];
			updateReportData();
		})
		.catch((error) => {
			console.error("Error fetching requests:", error);
			allRequests = [];
			updateReportData();
		});

	// Load employee credit limits data
	loadEmployeeCreditLimits();
}

function updateReportData() {
	const selectedMonth = document.getElementById("monthSelector").value;
	const [year, month] = selectedMonth.split("-");

	// Filter requests for selected month
	const monthStart = new Date(year, month - 1, 1);
	const monthEnd = new Date(year, month, 0);

	const monthRequests = Array.isArray(allRequests)
		? allRequests.filter((req) => {
				const reqDate = new Date(req.reqS_datetime);
				return reqDate >= monthStart && reqDate <= monthEnd;
		  })
		: [];

	// Group by req_id and get the latest status for each request
	const latestRequestsMap = {};
	monthRequests.forEach((req) => {
		const id = req.req_id;
		if (
			!latestRequestsMap[id] ||
			new Date(req.reqS_datetime) >
				new Date(latestRequestsMap[id].reqS_datetime)
		) {
			latestRequestsMap[id] = req;
		}
	});
	const latestRequests = Object.values(latestRequestsMap);

	// Update summary cards using both metrics
	updateSummaryCards(latestRequests, monthRequests);

	// Update charts (can use all status changes or just latest, depending on your preference)
	updateCharts(monthRequests);

	// Update detailed table (show all status changes for the month)
	updateDetailedTable(monthRequests);

	// Refresh employee credit limits to show updated usage
	loadEmployeeCreditLimits();
}

function updateSummaryCards(latestRequests, monthRequests) {
	// 1. Total Requests (unique req_id for the month)
	const uniqueRequestIds = new Set(monthRequests.map((req) => req.req_id));
	const totalRequests = uniqueRequestIds.size;

	// 2. Approved Requests (all records with status 'approved')
	const approvedRequests = monthRequests.filter(
		(req) => req.statusR_name.toLowerCase() === "approved"
	).length;

	// 3. Total Disbursed (sum of all records with status 'completed')
	const totalDisbursedCompleted = monthRequests
		.filter((req) => req.statusR_name.toLowerCase() === "completed")
		.reduce((sum, req) => sum + Number(req.req_budget || 0), 0);

	// 4. Previous month's completed requests and disbursed
	const previousMonth = new Date(
		document.getElementById("monthSelector").value
	);
	previousMonth.setMonth(previousMonth.getMonth() - 1);
	const prevMonthStart = new Date(
		previousMonth.getFullYear(),
		previousMonth.getMonth(),
		1
	);
	const prevMonthEnd = new Date(
		previousMonth.getFullYear(),
		previousMonth.getMonth() + 1,
		0
	);

	const prevMonthRequests = Array.isArray(allRequests)
		? allRequests.filter((req) => {
				const reqDate = new Date(req.reqS_datetime);
				return reqDate >= prevMonthStart && reqDate <= prevMonthEnd;
		  })
		: [];

	const prevMonthDisbursedCompleted = prevMonthRequests
		.filter((req) => req.statusR_name.toLowerCase() === "completed")
		.reduce((sum, req) => sum + Number(req.req_budget || 0), 0);

	// 5. Calculate previous month's percent change (compared to the month before it)
	const twoMonthsAgo = new Date(document.getElementById("monthSelector").value);
	twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
	const twoMonthsAgoStart = new Date(
		twoMonthsAgo.getFullYear(),
		twoMonthsAgo.getMonth(),
		1
	);
	const twoMonthsAgoEnd = new Date(
		twoMonthsAgo.getFullYear(),
		twoMonthsAgo.getMonth() + 1,
		0
	);

	const twoMonthsAgoRequests = Array.isArray(allRequests)
		? allRequests.filter((req) => {
				const reqDate = new Date(req.reqS_datetime);
				return reqDate >= twoMonthsAgoStart && reqDate <= twoMonthsAgoEnd;
		  })
		: [];
	const twoMonthsAgoDisbursed = twoMonthsAgoRequests
		.filter((req) => req.statusR_name.toLowerCase() === "completed")
		.reduce((sum, req) => sum + Number(req.req_budget || 0), 0);

	let prevMonthlyChange;
	if (twoMonthsAgoDisbursed === 0 && prevMonthDisbursedCompleted === 0) {
		prevMonthlyChange = "No Data";
	} else if (twoMonthsAgoDisbursed === 0) {
		prevMonthlyChange = "100%";
	} else {
		prevMonthlyChange =
			(
				((prevMonthDisbursedCompleted - twoMonthsAgoDisbursed) /
					twoMonthsAgoDisbursed) *
				100
			).toFixed(1) + "%";
	}

	// 6. Monthly Change (current month vs previous month)
	let monthlyChange;
	if (prevMonthDisbursedCompleted === 0 && totalDisbursedCompleted === 0) {
		monthlyChange = "No Data";
	} else if (prevMonthDisbursedCompleted === 0) {
		monthlyChange = "100%";
	} else {
		monthlyChange =
			(
				((totalDisbursedCompleted - prevMonthDisbursedCompleted) /
					prevMonthDisbursedCompleted) *
				100
			).toFixed(1) + "%";
	}

	// 7. Update DOM
	document.getElementById("totalRequests").textContent = totalRequests;
	document.getElementById("approvedRequests").textContent = approvedRequests;
	document.getElementById(
		"totalDisbursed"
	).textContent = `₱${totalDisbursedCompleted.toLocaleString()}`;
	const monthlyChangeElement = document.getElementById("monthlyChange");
	monthlyChangeElement.innerHTML = `
		<span style="font-size:2rem;font-weight:bold;">${monthlyChange}</span><br/>
		<span style="font-size:1rem;color:#6b7280;opacity:0.7;">Prev Month: <b>${prevMonthlyChange}</b></span>
	`;
	monthlyChangeElement.className = `text-2xl font-semibold ${
		monthlyChange === "N/A"
			? "text-gray-600"
			: parseFloat(monthlyChange) >= 0
			? "text-green-600"
			: "text-red-600"
	}`;
}

function updateCharts(monthRequests) {
	// Monthly Trend Chart
	const monthlyTrendCtx = document
		.getElementById("monthlyTrendChart")
		.getContext("2d");
	if (monthlyTrendChart) {
		monthlyTrendChart.destroy();
	}

	// --- START: Revamped Monthly Trend Chart Logic (Actual Calendar Weeks) ---

	// Always use monthSelector for year and month context of the chart
	const selectedMonthValue = document.getElementById("monthSelector").value;
	const [selectedYearStr, selectedMonthStr] = selectedMonthValue.split("-");
	const year = parseInt(selectedYearStr);
	const month = parseInt(selectedMonthStr) - 1; // 0-indexed

	const weeklyDataAgg = {};
	let currentIterationDate = new Date(year, month, 1); // Start at the first of the month
	let weekCounter = 1;
	const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
	const lastDayOfSelectedMonth = new Date(year, month + 1, 0);

	while (
		currentIterationDate.getMonth() === month &&
		currentIterationDate <= lastDayOfSelectedMonth
	) {
		const weekKey = `week${weekCounter}`;
		const segmentStart = new Date(currentIterationDate);
		let segmentEnd = new Date(currentIterationDate);
		segmentEnd.setDate(segmentEnd.getDate() + (6 - segmentStart.getDay())); // Potential end of calendar week

		if (segmentEnd > lastDayOfSelectedMonth) {
			segmentEnd = new Date(lastDayOfSelectedMonth);
		}

		const shortMonthName = monthFormatter.format(segmentStart);
		const label = `${shortMonthName} ${segmentStart.getDate()} - ${segmentEnd.getDate()}`;

		weeklyDataAgg[weekKey] = {
			label: label,
			filterStartDate: new Date(segmentStart.setHours(0, 0, 0, 0)),
			filterEndDate: new Date(segmentEnd.setHours(23, 59, 59, 999)),
			totalSet: new Set(),
			approvedSet: new Set(),
			completedSet: new Set(),
			rejectedSet: new Set(),
			pendingSet: new Set(),
		};

		currentIterationDate = new Date(segmentEnd);
		currentIterationDate.setDate(currentIterationDate.getDate() + 1);
		weekCounter++;
	}

	// Aggregate data by the calculated week segments
	monthRequests.forEach((req) => {
		const reqDate = new Date(req.reqS_datetime); // Keep as Date object with time

		for (const weekKey in weeklyDataAgg) {
			const week = weeklyDataAgg[weekKey];
			if (reqDate >= week.filterStartDate && reqDate <= week.filterEndDate) {
				week.totalSet.add(req.req_id);
				const status = req.statusR_name.toLowerCase();
				if (status === "approved") week.approvedSet.add(req.req_id);
				if (status === "completed") week.completedSet.add(req.req_id);
				if (status === "rejected") week.rejectedSet.add(req.req_id);
				if (status === "pending") week.pendingSet.add(req.req_id);
				break;
			}
		}
	});

	const chartDataSegments = Object.values(weeklyDataAgg);

	const chartLabels = chartDataSegments.map((segment) => segment.label);
	const totalReqData = chartDataSegments.map(
		(segment) => segment.totalSet.size
	);
	const approvedReqData = chartDataSegments.map(
		(segment) => segment.approvedSet.size
	);
	const completedReqData = chartDataSegments.map(
		(segment) => segment.completedSet.size
	);
	const rejectedReqData = chartDataSegments.map(
		(segment) => segment.rejectedSet.size
	);
	const pendingReqData = chartDataSegments.map(
		(segment) => segment.pendingSet.size
	);

	let datasetsForChart = [
		{
			label: "Approved Requests",
			data: approvedReqData,
			backgroundColor: "rgba(34, 197, 94, 0.7)", // Green
			borderColor: "rgba(34, 197, 94, 1)",
			borderWidth: 1,
			totalCount: approvedReqData.reduce((a, b) => a + b, 0),
		},
		{
			label: "Completed Requests",
			data: completedReqData,
			backgroundColor: "rgba(59, 130, 246, 0.7)", // Blue
			borderColor: "rgba(59, 130, 246, 1)",
			borderWidth: 1,
			totalCount: completedReqData.reduce((a, b) => a + b, 0),
		},
		{
			label: "Rejected Requests",
			data: rejectedReqData,
			backgroundColor: "rgba(255, 99, 132, 0.7)", // Red
			borderColor: "rgba(255, 99, 132, 1)",
			borderWidth: 1,
			totalCount: rejectedReqData.reduce((a, b) => a + b, 0),
		},
		{
			label: "Pending Requests",
			data: pendingReqData,
			backgroundColor: "rgba(255, 193, 7, 0.7)", // Yellow
			borderColor: "rgba(255, 193, 7, 1)",
			borderWidth: 1,
			totalCount: pendingReqData.reduce((a, b) => a + b, 0),
		},
	];

	datasetsForChart.sort((a, b) => b.totalCount - a.totalCount);

	datasetsForChart.unshift({
		label: "Total Requests",
		data: totalReqData,
		backgroundColor: "rgba(139, 28, 35, 0.7)", // Primary Dark Red
		borderColor: "rgba(139, 28, 35, 1)",
		borderWidth: 1,
	});

	datasetsForChart.forEach((ds) => delete ds.totalCount);

	monthlyTrendChart = new Chart(monthlyTrendCtx, {
		type: "bar",
		data: {
			labels: chartLabels,
			datasets: datasetsForChart,
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "top",
				},
				tooltip: {
					mode: "index",
					intersect: false,
					callbacks: {
						title: function (tooltipItems) {
							return tooltipItems[0].label;
						},
					},
				},
			},
			scales: {
				x: {
					stacked: false,
					title: {
						display: true,
						text: "Week of the Month",
					},
				},
				y: {
					stacked: false,
					beginAtZero: true,
					ticks: {
						stepSize: 1,
						precision: 0,
					},
					title: {
						display: true,
						text: "Number of Requests",
					},
				},
			},
		},
	});
	// --- END: Revamped Monthly Trend Chart Logic ---

	// Modern Request Status Distribution Chart
	const statusDistributionCtx = document
		.getElementById("statusDistributionChart")
		.getContext("2d");
	if (statusDistributionChart) {
		statusDistributionChart.destroy();
	}

	const statusCounts = {};
	monthRequests.forEach((req) => {
		const status = req.statusR_name.toLowerCase();
		statusCounts[status] = (statusCounts[status] || 0) + 1;
	});

	statusDistributionChart = new Chart(statusDistributionCtx, {
		type: "doughnut",
		data: {
			labels: Object.keys(statusCounts).map(
				(status) => status.charAt(0).toUpperCase() + status.slice(1)
			),
			datasets: [
				{
					data: Object.values(statusCounts),
					backgroundColor: [
						"rgba(255, 193, 7, 0.85)", // Pending (modern yellow)
						"rgba(34, 197, 94, 0.85)", // Completed (modern green)
						"rgba(239, 68, 68, 0.85)", // Approved (modern red)
						"rgba(59, 130, 246, 0.85)", // Rejected/Other (modern blue)
					],
					borderRadius: 20, // Rounded edges
					borderWidth: 4,
					borderColor: "#fff",
					hoverOffset: 12,
				},
			],
		},
		options: {
			cutout: "75%", // Thinner ring
			plugins: {
				legend: {
					display: false, // Hide default legend
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							const label = context.label || "";
							const value = context.parsed;
							const total = context.dataset.data.reduce((a, b) => a + b, 0);
							const percent = ((value / total) * 100).toFixed(1);
							return `${label}: ${value} (${percent}%)`;
						},
					},
				},
				datalabels: {
					color: "#222",
					font: { weight: "bold", size: 16 },
					formatter: (value, ctx) => {
						const total = ctx.chart.data.datasets[0].data.reduce(
							(a, b) => a + b,
							0
						);
						return total ? Math.round((value / total) * 100) + "%" : "";
					},
				},
			},
			animation: {
				animateRotate: true,
				duration: 1200,
			},
			layout: {
				padding: 20,
			},
		},
		plugins: [ChartDataLabels],
	});

	// Calculate total disbursed (completed) for all time
	const totalDisbursed = allRequests
		.filter(
			(req) =>
				req.statusR_name && req.statusR_name.toLowerCase() === "completed"
		)
		.reduce((sum, req) => sum + Number(req.req_budget || 0), 0);
	updateDisbursedVsBudgetedChart(totalDisbursed);
}

function updateDetailedTable(monthRequests) {
	currentDetailedMonthRequests = [...monthRequests]; // Store a copy of the raw month requests
	renderFilteredAndSortedDetailedReport(); // Call the new function to render
}

// New function to handle filtering, sorting, and rendering of the detailed report table
function renderFilteredAndSortedDetailedReport() {
	const tableBody = document.getElementById("reportTableBody");
	if (!tableBody) return;

	const searchTerm = document.getElementById("reportSearchInput")
		? document.getElementById("reportSearchInput").value.trim().toLowerCase()
		: "";
	const statusFilter = document.getElementById("reportStatusFilter")
		? document.getElementById("reportStatusFilter").value
		: "all";
	const sortValue = document.getElementById("reportSortSelect")
		? document.getElementById("reportSortSelect").value
		: "date-desc";

	let processedRequests = [...currentDetailedMonthRequests];

	// 1. Apply Search Filter
	if (searchTerm) {
		processedRequests = processedRequests.filter((req) => {
			const employeeName = `${req.user_firstname || ""} ${
				req.user_lastname || ""
			}`.toLowerCase();
			const purpose = (req.req_purpose || "").toLowerCase();
			return employeeName.includes(searchTerm) || purpose.includes(searchTerm);
		});
	}

	// 2. Apply Status Filter
	if (statusFilter !== "all") {
		processedRequests = processedRequests.filter(
			(req) => req.statusR_name.toLowerCase() === statusFilter
		);
	}

	// 3. Apply Sorting
	const [sortField, sortDirection] = sortValue.split("-");
	processedRequests.sort((a, b) => {
		let valA, valB;

		switch (sortField) {
			case "date":
				valA = new Date(a.reqS_datetime);
				valB = new Date(b.reqS_datetime);
				break;
			case "employee":
				valA = `${a.user_firstname || ""} ${
					a.user_lastname || ""
				}`.toLowerCase();
				valB = `${b.user_firstname || ""} ${
					b.user_lastname || ""
				}`.toLowerCase();
				break;
			case "purpose":
				valA = (a.req_purpose || "").toLowerCase();
				valB = (b.req_purpose || "").toLowerCase();
				break;
			case "amount":
				valA = Number(a.req_budget || 0);
				valB = Number(b.req_budget || 0);
				break;
			case "status":
				valA = (a.statusR_name || "").toLowerCase();
				valB = (b.statusR_name || "").toLowerCase();
				break;
			default:
				// Default to date-desc if sortField is unknown, though dropdown should prevent this
				valA = new Date(b.reqS_datetime); // Note: b first for desc
				valB = new Date(a.reqS_datetime); // Note: a second for desc
				break;
		}

		if (valA < valB) {
			return sortDirection === "asc" ? -1 : 1;
		}
		if (valA > valB) {
			return sortDirection === "asc" ? 1 : -1;
		}
		return 0;
	});

	// 4. Render Table
	tableBody.innerHTML = ""; // Clear existing rows

	console.log(
		"Detailed Report: Filtered and sorted requests count:",
		processedRequests.length
	);
	if (processedRequests.length > 0) {
		console.log(
			"Detailed Report: First request data being rendered:",
			processedRequests[0]
		);
	}

	if (processedRequests.length === 0) {
		let message = "No requests found for the selected month";
		if (searchTerm || statusFilter !== "all") {
			message = "No requests match your current filter criteria.";
		}
		tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    ${message}
                </td>
            </tr>
        `;
		return;
	}

	processedRequests.forEach((req) => {
		const row = document.createElement("tr");
		const statusColorClasses = getStatusColor(req.statusR_name);

		console.log(
			`Detailed Report Row: ID=${req.req_id}, Status Name='${req.statusR_name}', Status Classes='${statusColorClasses}'`
		);

		row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                ${new Date(req.reqS_datetime).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                ${req.user_firstname} ${req.user_lastname}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                ${req.req_purpose}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                ₱${Number(req.req_budget).toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColorClasses}">
                    ${req.statusR_name}
                </span>
            </td>
        `;
		tableBody.appendChild(row);
	});
}

function getStatusColor(status) {
	if (!status) {
		return "bg-gray-100 text-gray-800"; // Default for undefined status
	}
	switch (status.toLowerCase()) {
		case "pending":
			return "bg-yellow-100 text-yellow-800";
		case "approved":
			return "bg-green-100 text-green-800";
		case "rejected":
			return "bg-red-100 text-red-800";
		case "completed":
			return "bg-blue-100 text-blue-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

function updateDisbursedVsBudgetedChart(totalDisbursed) {
	axios
		.post(
			"http://localhost/cashAdvancedSystem/php/admin.php",
			new URLSearchParams({
				operation: "getTotalBudgeted",
			})
		)
		.then((response) => {
			const totalBudgeted = response.data.total_budgeted || 0;
			const remaining = Math.max(totalBudgeted - totalDisbursed, 0);

			const canvas = document.getElementById("disbursedVsBudgetedChart");
			const ctx = canvas.getContext("2d");

			// Robust destroy: use Chart.getChart if available (Chart.js v3+)
			if (window.Chart && typeof window.Chart.getChart === "function") {
				const existingChart = window.Chart.getChart(canvas);
				if (existingChart) {
					existingChart.destroy();
				}
			} else if (
				window.disbursedVsBudgetedChart &&
				typeof window.disbursedVsBudgetedChart.destroy === "function"
			) {
				window.disbursedVsBudgetedChart.destroy();
			}

			window.disbursedVsBudgetedChart = new Chart(ctx, {
				type: "doughnut",
				data: {
					labels: ["Disbursed", "Remaining"],
					datasets: [
						{
							data: [totalDisbursed, remaining],
							backgroundColor: [
								"rgba(34, 197, 94, 0.85)", // Disbursed (green)
								"rgba(59, 130, 246, 0.85)", // Remaining (blue)
							],
							borderRadius: 20,
							borderWidth: 4,
							borderColor: "#fff",
							hoverOffset: 12,
						},
					],
				},
				options: {
					cutout: "75%",
					plugins: {
						legend: { display: true },
					},
				},
			});
		});
}

// Function to load and display employee credit limits
function loadEmployeeCreditLimits() {
	const formData = new FormData();
	formData.append("operation", "getUsers");

	axios
		.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
		.then((response) => {
			let users = response.data;
			if (typeof users === "string") {
				try {
					users = JSON.parse(users);
				} catch (e) {
					console.error("Error parsing users:", e);
					users = [];
				}
			}

			if (Array.isArray(users)) {
				// Process users to add their usage data
				processEmployeeData(users);
			}
		})
		.catch((error) => {
			console.error("Error fetching users:", error);
			// Show error message in the container
			const container = document.getElementById("employeeLimitsContainer");
			if (container) {
				container.innerHTML = `
					<div class="col-span-3 p-4 text-center text-red-500">
						<i class="fas fa-exclamation-circle mr-2"></i>
						Error loading employee data
					</div>
				`;
			}
		});
}

// Process employee data with usage calculations
function processEmployeeData(users) {
	// Skip if no users
	if (!Array.isArray(users) || !users.length) {
		renderEmployeeCreditLimits([]);
		return;
	}

	// Calculate used amount for each employee based on completed requests
	const userUsedAmounts = {};

	if (Array.isArray(allRequests)) {
		allRequests.forEach((req) => {
			if (req.statusR_name && req.statusR_name.toLowerCase() === "completed") {
				const userId = req.req_userId;
				if (!userUsedAmounts[userId]) {
					userUsedAmounts[userId] = 0;
				}
				userUsedAmounts[userId] += Number(req.req_budget || 0);
			}
		});
	}

	// Process each user to add usage data
	employeeData = users
		.filter((user) => user.userL_id !== "1") // Filter out admin users
		.map((user) => {
			const baseLimit = parseFloat(user.user_availableLimit || 0);
			const usedAmount = parseFloat(userUsedAmounts[user.user_id] || 0);
			const availableLimit = Math.max(0, baseLimit - usedAmount);
			const usagePercent = baseLimit > 0 ? (usedAmount / baseLimit) * 100 : 0;

			return {
				...user,
				baseLimit,
				usedAmount,
				availableLimit,
				usagePercent,
			};
		});

	// Default sort by name
	sortEmployees("name");
}

// Sort employees based on selected criteria
function sortEmployees(sortBy) {
	if (!employeeData.length) return;

	const sortedData = [...employeeData];

	switch (sortBy) {
		case "name":
			sortedData.sort((a, b) =>
				(a.user_firstname + " " + a.user_lastname).localeCompare(
					b.user_firstname + " " + b.user_lastname
				)
			);
			break;
		case "limit-high":
			sortedData.sort((a, b) => b.baseLimit - a.baseLimit);
			break;
		case "limit-low":
			sortedData.sort((a, b) => a.baseLimit - b.baseLimit);
			break;
		case "usage-high":
			sortedData.sort((a, b) => b.usedAmount - a.usedAmount);
			break;
		case "usage-low":
			sortedData.sort((a, b) => a.usedAmount - b.usedAmount);
			break;
		case "available-high":
			sortedData.sort((a, b) => b.availableLimit - a.availableLimit);
			break;
		case "available-low":
			sortedData.sort((a, b) => a.availableLimit - b.availableLimit);
			break;
		default:
			// Default to name sorting
			sortedData.sort((a, b) =>
				(a.user_firstname + " " + a.user_lastname).localeCompare(
					b.user_firstname + " " + b.user_lastname
				)
			);
	}

	// Render the sorted data
	renderEmployeeCreditLimits(sortedData);

	// Re-apply any active search
	const searchInput = document.getElementById("employeeSearchInput");
	if (searchInput && searchInput.value.trim()) {
		searchEmployees(searchInput.value.trim().toLowerCase());
	}
}

// Function to render employee credit limit cards
function renderEmployeeCreditLimits(users) {
	const container = document.getElementById("employeeLimitsContainer");
	if (!container) return;

	// Clear loading placeholders
	container.innerHTML = "";

	// If no users found
	if (!users.length) {
		container.innerHTML = `
			<div class="col-span-3 p-4 text-center text-gray-500 dark:text-gray-400">
				No employee data available
			</div>
		`;
		return;
	}

	// Create a card for each employee
	users.forEach((user) => {
		// Get pre-calculated values if available
		const baseLimit =
			user.baseLimit || parseFloat(user.user_availableLimit || 0);
		const usedAmount = user.usedAmount || 0;
		const availableLimit =
			user.availableLimit || Math.max(0, baseLimit - usedAmount);
		const usagePercent =
			user.usagePercent || (baseLimit > 0 ? (usedAmount / baseLimit) * 100 : 0);
		const displayPercent = Math.min(100, Math.round(usagePercent));

		// Color the progress bar based on usage
		let progressColor = "bg-primary";
		if (usagePercent >= 90) {
			progressColor = "bg-red-500";
		} else if (usagePercent >= 75) {
			progressColor = "bg-yellow-500";
		} else if (usagePercent >= 50) {
			progressColor = "bg-blue-500";
		}

		const card = document.createElement("div");
		card.className =
			"bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow";

		// Add click event to show employee transaction history modal
		card.addEventListener("click", () => {
			showEmployeeTransactionHistory(user);
		});

		// Generate initials for the avatar
		const initials = `${user.user_firstname[0] || ""}${
			user.user_lastname[0] || ""
		}`.toUpperCase();

		card.innerHTML = `
			<div class="p-4">
				<div class="flex items-center mb-4">
					<div class="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
						${initials}
					</div>
					<div class="ml-3">
						<h4 class="font-medium text-gray-900 dark:text-gray-100">${
							user.user_firstname
						} ${user.user_lastname}</h4>
						<p class="text-sm text-gray-500 dark:text-gray-400">${
							user.user_status === "1" ? "Active" : "Inactive"
						}</p>
					</div>
				</div>
				
				<div class="mb-4">
					<div class="flex justify-between items-center mb-1">
						<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Available Limit</p>
						<span class="text-2xl font-bold text-primary">₱${availableLimit.toLocaleString()}</span>
					</div>
					<div class="flex justify-between text-sm text-gray-500 dark:text-gray-400">
						<span>Base Limit: ₱${baseLimit.toLocaleString()}</span>
						<span>Used: ₱${usedAmount.toLocaleString()}</span>
					</div>
				</div>
				
				<div class="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
					<div class="${progressColor} h-2.5 rounded-full" style="width: ${displayPercent}%"></div>
					<span class="absolute right-0 -top-5 text-xs font-semibold ${
						usagePercent >= 90
							? "text-red-500"
							: "text-gray-500 dark:text-gray-400"
					}">
						${displayPercent}% used
					</span>
				</div>
				
				<div class="mt-4 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
					<span class="flex items-center">
						<i class="fas fa-info-circle mr-1"></i>
						Last updated: ${new Date().toLocaleDateString()}
					</span>
					<span class="inline-flex items-center text-primary">
						<i class="fas fa-history mr-1"></i>
						View History
					</span>
				</div>
			</div>
		`;

		container.appendChild(card);
	});
}

// Function to search employees by name
function searchEmployees(searchTerm) {
	const employeeCards = document.querySelectorAll(
		"#employeeLimitsContainer > div:not(.col-span-3)"
	);

	if (!employeeCards.length) return;

	// If search term is empty, show all cards
	if (!searchTerm) {
		employeeCards.forEach((card) => {
			card.style.display = "";
		});
		return;
	}

	// Filter cards based on employee name
	let foundAny = false;

	employeeCards.forEach((card) => {
		const nameElement = card.querySelector("h4");
		if (nameElement) {
			const employeeName = nameElement.textContent.toLowerCase();
			if (employeeName.includes(searchTerm)) {
				card.style.display = "";
				foundAny = true;
			} else {
				card.style.display = "none";
			}
		}
	});

	// Show "no results" message if no matches
	const container = document.getElementById("employeeLimitsContainer");
	const noResultsMsg = document.getElementById("noSearchResults");

	if (!foundAny) {
		if (!noResultsMsg) {
			const msgElement = document.createElement("div");
			msgElement.id = "noSearchResults";
			msgElement.className =
				"col-span-3 p-4 text-center text-gray-500 dark:text-gray-400";
			msgElement.innerHTML = `
				<i class="fas fa-search mr-2"></i>
				No employees found matching "${searchTerm}"
			`;
			container.appendChild(msgElement);
		}
	} else if (noResultsMsg) {
		noResultsMsg.remove();
	}
}

// Function to show transaction history modal for a specific employee
function showEmployeeTransactionHistory(employee) {
	// Check if modal already exists, remove if it does
	let existingModal = document.getElementById("employeeHistoryModal");
	if (existingModal) {
		existingModal.remove();
	}

	// Create modal element
	const modal = document.createElement("div");
	modal.id = "employeeHistoryModal";
	modal.className =
		"fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";

	// Calculate available limit as base limit minus used amount
	const availableLimit = Math.max(0, employee.baseLimit - employee.usedAmount);

	// Initial modal content with loading state
	modal.innerHTML = `
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
			<div class="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4">
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white">
					${employee.user_firstname} ${employee.user_lastname} - Transaction History
				</h3>
				<button id="closeModal" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none">
					<i class="fas fa-times text-xl"></i>
				</button>
			</div>
			<div class="p-6 flex-grow overflow-auto">
				<div class="employee-info mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Base Limit</h4>
						<p class="text-2xl font-bold text-primary">₱${employee.baseLimit.toLocaleString()}</p>
					</div>
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Used Amount</h4>
						<p class="text-2xl font-bold text-blue-500">₱${employee.usedAmount.toLocaleString()}</p>
					</div>
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Available Limit</h4>
						<p class="text-2xl font-bold text-green-500">₱${availableLimit.toLocaleString()}</p>
					</div>
				</div>
				
				<div class="employee-contact mb-6">
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Contact</h4>
						<p class="text-lg font-medium text-gray-800 dark:text-gray-200">${
							employee.user_contactNumber || "N/A"
						}</p>
					</div>
				</div>
				
				<div class="transaction-filter mb-4 flex flex-col md:flex-row gap-4">
					<div class="md:w-1/3">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status</label>
						<select id="statusFilter" class="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
							<option value="all">All Statuses</option>
							<option value="pending">Pending</option>
							<option value="approved">Approved</option>
							<option value="completed">Completed</option>
							<option value="rejected">Rejected</option>
						</select>
					</div>
					<div class="md:w-1/3">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
						<select id="dateRangeFilter" class="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
							<option value="all">All Time</option>
							<option value="30">Last 30 Days</option>
							<option value="90">Last 3 Months</option>
							<option value="180">Last 6 Months</option>
							<option value="365">Last Year</option>
						</select>
					</div>
					<div class="md:w-1/3">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
								<i class="fas fa-search text-gray-400"></i>
							</div>
							<input type="text" id="transactionSearch" placeholder="Search purpose or description..." class="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
						</div>
					</div>
				</div>
				
				<div class="transaction-history-container overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead class="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">DATE</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PURPOSE</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">AMOUNT</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">STATUS</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">DESCRIPTION</th>
							</tr>
						</thead>
						<tbody id="employeeTransactionTableBody" class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							<tr>
								<td colspan="5" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
									<div class="flex justify-center items-center space-x-2">
										<i class="fas fa-circle-notch fa-spin"></i>
										<span>Loading transaction history...</span>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<div class="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
				<button id="closeModalButton" class="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
					Close
				</button>
			</div>
		</div>
	`;

	// Add modal to body
	document.body.appendChild(modal);

	// Add event listeners for closing the modal
	document.getElementById("closeModal").addEventListener("click", () => {
		modal.remove();
	});

	document.getElementById("closeModalButton").addEventListener("click", () => {
		modal.remove();
	});

	// Close modal when clicking outside the content
	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			modal.remove();
		}
	});

	// Add keydown event to close modal with Escape key
	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape" && document.getElementById("employeeHistoryModal")) {
			modal.remove();
		}
	});

	// Load employee's transaction history
	loadEmployeeTransactions(employee.user_id);

	// Add event listeners for filtering
	const statusFilter = document.getElementById("statusFilter");
	const dateRangeFilter = document.getElementById("dateRangeFilter");
	const transactionSearch = document.getElementById("transactionSearch");

	if (statusFilter && dateRangeFilter && transactionSearch) {
		statusFilter.addEventListener("change", () =>
			filterTransactions(employee.user_id)
		);
		dateRangeFilter.addEventListener("change", () =>
			filterTransactions(employee.user_id)
		);
		transactionSearch.addEventListener(
			"input",
			debounce(() => filterTransactions(employee.user_id), 300)
		);
	}
}

// Helper function to debounce search input
function debounce(func, wait) {
	let timeout;
	return function () {
		const context = this;
		const args = arguments;
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			func.apply(context, args);
		}, wait);
	};
}

// Function to load employee transaction history
function loadEmployeeTransactions(userId, filters = {}) {
	const tableBody = document.getElementById("employeeTransactionTableBody");
	if (!tableBody) return;

	// Filter all requests for this specific employee
	const employeeRequests = Array.isArray(allRequests)
		? allRequests.filter((req) => req.req_userId === userId)
		: [];

	// Apply filters if provided
	let filteredRequests = [...employeeRequests];

	// Status filter
	if (filters.status && filters.status !== "all") {
		filteredRequests = filteredRequests.filter(
			(req) => req.statusR_name.toLowerCase() === filters.status.toLowerCase()
		);
	}

	// Date range filter
	if (filters.dateRange && filters.dateRange !== "all") {
		const daysAgo = parseInt(filters.dateRange);
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

		filteredRequests = filteredRequests.filter((req) => {
			const reqDate = new Date(req.reqS_datetime);
			return reqDate >= cutoffDate;
		});
	}

	// Search filter
	if (filters.search && filters.search.trim() !== "") {
		const searchTerm = filters.search.trim().toLowerCase();
		filteredRequests = filteredRequests.filter(
			(req) =>
				(req.req_purpose &&
					req.req_purpose.toLowerCase().includes(searchTerm)) ||
				(req.req_desc && req.req_desc.toLowerCase().includes(searchTerm))
		);
	}

	// Sort by date (newest first)
	filteredRequests.sort(
		(a, b) => new Date(b.reqS_datetime) - new Date(a.reqS_datetime)
	);

	// Update table
	tableBody.innerHTML = "";

	if (filteredRequests.length === 0) {
		tableBody.innerHTML = `
			<tr>
				<td colspan="5" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
					No transaction history found for this employee
				</td>
			</tr>
		`;
		return;
	}

	// Group requests by req_id to show the latest status
	const requestGroups = {};
	filteredRequests.forEach((req) => {
		if (!requestGroups[req.req_id]) {
			requestGroups[req.req_id] = [];
		}
		requestGroups[req.req_id].push(req);
	});

	// For each group, create a row with all statuses in a collapsible format
	Object.values(requestGroups).forEach((group) => {
		// Sort by date (newest first)
		group.sort((a, b) => new Date(b.reqS_datetime) - new Date(a.reqS_datetime));

		// Get the latest status (first item after sorting)
		const latestReq = group[0];

		// Format date in MM/DD/YYYY format to match screenshot
		const reqDate = new Date(latestReq.reqS_datetime);
		const formattedDate = `${
			reqDate.getMonth() + 1
		}/${reqDate.getDate()}/${reqDate.getFullYear()}`;

		const row = document.createElement("tr");
		row.className =
			"hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer";

		// Get custom status styling that matches the screenshot
		const statusClass = getStatusClass(latestReq.statusR_name);

		row.innerHTML = `
			<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
				${formattedDate}
			</td>
			<td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
				${latestReq.req_purpose || "N/A"}
			</td>
			<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
				₱${Number(latestReq.req_budget || 0).toLocaleString()}
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				${statusClass}
			</td>
			<td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
				${latestReq.req_desc || "No description provided"}
			</td>
		`;

		// Add click event to show all statuses for this request
		if (group.length > 1) {
			row.addEventListener("click", () => {
				// Check if details row already exists
				const nextRow = row.nextElementSibling;
				if (nextRow && nextRow.classList.contains("status-history-row")) {
					nextRow.remove();
					return;
				}

				// Create details row
				const detailsRow = document.createElement("tr");
				detailsRow.className = "status-history-row bg-gray-50 dark:bg-gray-700";

				const statusHistoryHTML = group
					.map(
						(req) => `
					<div class="mb-2 pb-2 border-b border-gray-200 dark:border-gray-600 last:border-0 last:mb-0 last:pb-0">
						<div class="flex justify-between">
							<span class="font-medium">${req.statusR_name}</span>
							<span class="text-gray-500 dark:text-gray-400">${new Date(
								req.reqS_datetime
							).toLocaleString()}</span>
						</div>
					</div>
				`
					)
					.join("");

				detailsRow.innerHTML = `
					<td colspan="5" class="px-6 py-4">
						<div class="text-sm text-gray-700 dark:text-gray-300">
							<h4 class="font-medium mb-2">Status History</h4>
							${statusHistoryHTML}
						</div>
					</td>
				`;

				// Insert after the current row
				row.parentNode.insertBefore(detailsRow, row.nextSibling);
			});
		}

		tableBody.appendChild(row);
	});
}

// Custom function to generate status display that matches the screenshot
function getStatusClass(status) {
	switch (status.toLowerCase()) {
		case "completed":
			return `<span class="px-4 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
						Completed
					</span>`;
		case "approved":
			return `<span class="px-4 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
						Approved
					</span>`;
		case "pending":
			return `<span class="px-4 py-1 bg-yellow-500 text-white rounded-full text-xs font-medium">
						Pending
					</span>`;
		case "rejected":
			return `<span class="px-4 py-1 bg-red-500 text-white rounded-full text-xs font-medium">
						Rejected
					</span>`;
		default:
			return `<span class="px-4 py-1 bg-gray-500 text-white rounded-full text-xs font-medium">
						${status}
					</span>`;
	}
}

// Function to filter transactions based on selected filters
function filterTransactions(userId) {
	const statusFilter = document.getElementById("statusFilter");
	const dateRangeFilter = document.getElementById("dateRangeFilter");
	const transactionSearch = document.getElementById("transactionSearch");

	if (!statusFilter || !dateRangeFilter || !transactionSearch) return;

	const filters = {
		status: statusFilter.value,
		dateRange: dateRangeFilter.value,
		search: transactionSearch.value,
	};

	loadEmployeeTransactions(userId, filters);
}

function printReportSection(sectionId) {
	const sectionName = sectionId.replace("Section", ""); // e.g. monthlyReport, employeeLimits, yearlyReport
	document.body.classList.add(`printing-${sectionId}`);

	// Optional: Add a title or more context dynamically if needed, specific to the section
	// For example, for monthly reports, you might want to show the selected month.
	let printTitleText = "Report";
	if (sectionId === "monthlyReportSection") {
		const selectedMonth = document.getElementById("monthSelector").value;
		const [year, month] = selectedMonth.split("-");
		const date = new Date(year, month - 1);
		const monthYearString = date.toLocaleString("default", {
			month: "long",
			year: "numeric",
		});
		printTitleText = `Monthly Disbursement Report - ${monthYearString}`;
	} else if (sectionId === "employeeLimitsSection") {
		printTitleText = "Employee Credit Limits Report";
	} else if (sectionId === "yearlyReportSection") {
		const selectedYear = document.getElementById("yearSelector").value;
		printTitleText = `Year-End Financial Summary - ${selectedYear}`;
	}

	// Add a temporary title for printing
	const printTitleElement = document.createElement("h1");
	printTitleElement.id = "printPageTitle";
	printTitleElement.className = "text-center text-2xl font-bold my-4"; // Style as needed
	printTitleElement.textContent = printTitleText;

	const sectionElement = document.getElementById(sectionId);
	if (sectionElement) {
		sectionElement.insertBefore(printTitleElement, sectionElement.firstChild);
	}

	// Give browser time to apply classes and styles
	setTimeout(() => {
		window.print();
	}, 100);

	// Clean up after printing (or if cancelled)
	// 'afterprint' event is not consistently reliable across all browsers for cleanup,
	// especially for quick actions. A timeout is a common workaround.
	setTimeout(() => {
		document.body.classList.remove(`printing-${sectionId}`);
		if (printTitleElement && printTitleElement.parentNode) {
			printTitleElement.parentNode.removeChild(printTitleElement);
		}
	}, 500); // Adjust timeout as needed
}
