document.addEventListener("DOMContentLoaded", () => {
	const API_URL = "http://localhost/cashAdvancedSystem/php/resources.php";

	const user = getSecureSession("user");
	const userId = user.user_id;

	// DOM Elements
	const cashMethodsContainer = document.getElementById("cashMethodsContainer");
	const addCashMethodBtn = document.getElementById("addCashMethodBtn");
	// Similar elements for Status Requests and User Levels will be added later
	const statusRequestsContainer = document.getElementById(
		"statusRequestsContainer"
	);
	const addStatusRequestBtn = document.getElementById("addStatusRequestBtn");
	const userLevelsContainer = document.getElementById("userLevelsContainer");
	const addUserLevelBtn = document.getElementById("addUserLevelBtn");

	const modalPlaceholder = document.getElementById("modalPlaceholder");

	// --- Generic Modal Handling ---
	function openModal(
		title,
		contentHtml,
		onSave,
		itemId = null,
		currentName = "",
		currentDesc = ""
	) {
		modalPlaceholder.innerHTML = `
            <div id="resourceModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 modal">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md modal-content">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-100">${title}</h3>
                        <button id="closeModalBtn" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div id="modalFormContent">${contentHtml}</div>
                    <div class="mt-6 flex justify-end space-x-3">
                        <button id="cancelModalBtn" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            Cancel
                        </button>
                        <button id="saveModalBtn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        `;

		document
			.getElementById("closeModalBtn")
			.addEventListener("click", closeModal);
		document
			.getElementById("cancelModalBtn")
			.addEventListener("click", closeModal);
		document
			.getElementById("saveModalBtn")
			.addEventListener("click", () => onSave(itemId));

		// Slight animation for modal appearance
		const modal = document.getElementById("resourceModal");
		const modalContent = modal.querySelector(".modal-content");
		setTimeout(() => {
			modal.classList.add("opacity-100");
			modalContent.classList.add("transform", "scale-100");
		}, 10);
		modalContent.classList.add("transform", "scale-95"); // Initial state for animation
	}

	function closeModal() {
		const modal = document.getElementById("resourceModal");
		if (modal) {
			const modalContent = modal.querySelector(".modal-content");
			modal.classList.remove("opacity-100");
			modalContent.classList.remove("transform", "scale-100");
			modalContent.classList.add("transform", "scale-95");
			setTimeout(() => {
				modalPlaceholder.innerHTML = "";
			}, 250); // Match transition duration
		}
	}

	// --- Generic Delete Confirmation Modal ---
	function showDeleteConfirmModal(itemType, itemId, itemName, deleteFunction) {
		const modal = document.getElementById("deleteConfirmResourceModal");
		const modalContent = modal.querySelector(".modal-content");
		const titleElement = document.getElementById("deleteConfirmTitle");
		const messageElement = document.getElementById("deleteConfirmMessage");
		const confirmBtn = document.getElementById("confirmResourceDelete");
		const cancelBtn = document.getElementById("cancelResourceDelete");

		titleElement.textContent = `Delete ${itemType}`;
		messageElement.textContent = `Are you sure you want to delete the ${itemType.toLowerCase()} "${itemName}"? This action cannot be undone.`;

		modal.classList.remove("hidden");
		modal.classList.add("flex");
		setTimeout(() => {
			modal.classList.add("opacity-100");
			modalContent.classList.add("scale-100");
		}, 10);

		const handleConfirm = () => {
			deleteFunction(itemId); // Call the specific delete function
			hideDeleteConfirmModal();
		};

		const handleCancel = () => {
			hideDeleteConfirmModal();
		};

		// Clean up previous listeners before adding new ones
		confirmBtn.replaceWith(confirmBtn.cloneNode(true));
		cancelBtn.replaceWith(cancelBtn.cloneNode(true));
		modal.replaceWith(modal.cloneNode(true)); // Re-clone modal to ensure its listeners are fresh

		// Add new listeners
		document
			.getElementById("confirmResourceDelete")
			.addEventListener("click", handleConfirm);
		document
			.getElementById("cancelResourceDelete")
			.addEventListener("click", handleCancel);
		document
			.getElementById("deleteConfirmResourceModal")
			.addEventListener("click", (e) => {
				if (e.target === e.currentTarget) {
					// Check if the click is on the overlay itself
					hideDeleteConfirmModal();
				}
			});
	}

	function hideDeleteConfirmModal() {
		const modal = document.getElementById("deleteConfirmResourceModal");
		const modalContent = modal.querySelector(".modal-content");

		if (modal) {
			modal.classList.remove("opacity-100");
			modalContent.classList.remove("scale-100");
			modalContent.classList.add("scale-95");
			setTimeout(() => {
				modal.classList.add("hidden");
				modal.classList.remove("flex");
			}, 250); // Match transition duration
		}
	}

	// --- Cash Methods ---
	async function fetchCashMethods() {
		try {
			const formData = new FormData();
			formData.append("operation", "getCashMethod");
			const response = await axios.post(API_URL, formData);
			if (response.data && Array.isArray(response.data)) {
				renderCashMethods(response.data);
			} else if (response.data && response.data.error) {
				showToast(`Error: ${response.data.error}`, "error");
				cashMethodsContainer.innerHTML = `<p class="text-red-500">${response.data.error}</p>`;
			} else {
				cashMethodsContainer.innerHTML =
					"<p>No cash methods found or error fetching data.</p>";
			}
		} catch (error) {
			console.error("Error fetching cash methods:", error);
			showToast("Failed to fetch cash methods.", "error");
			cashMethodsContainer.innerHTML =
				'<p class="text-red-500">Failed to load data. Check console for details.</p>';
		}
	}

	function renderCashMethods(cashMethods) {
		if (!cashMethods.length) {
			cashMethodsContainer.innerHTML =
				'<p class="text-gray-500 dark:text-gray-400">No cash methods configured yet.</p>';
			return;
		}
		cashMethodsContainer.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        ${cashMethods
													.map(
														(method) => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${method.cashM_name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button class="edit-cash-method-btn text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" data-id="${method.cashM_id}" data-name="${method.cashM_name}" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-cash-method-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" data-id="${method.cashM_id}" data-name="${method.cashM_name}" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `
													)
													.join("")}
                    </tbody>
                </table>
            </div>
        `;

		document.querySelectorAll(".edit-cash-method-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const id = e.currentTarget.dataset.id;
				const name = e.currentTarget.dataset.name;
				openEditCashMethodModal(id, name);
			});
		});

		document.querySelectorAll(".delete-cash-method-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const id = e.currentTarget.dataset.id;
				const name = e.currentTarget.dataset.name;
				showDeleteConfirmModal("Cash Method", id, name, deleteCashMethod);
			});
		});
	}

	function openAddCashMethodModal() {
		const formHtml = `
            <div>
                <label for="cashMethodName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
                <input type="text" id="cashMethodName" class="mt-1 block w-full rounded-md bg-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2" />
            </div>
        `;
		openModal("Add New Cash Method", formHtml, saveNewCashMethod);
	}

	function openEditCashMethodModal(id, currentName) {
		const formHtml = `
            <div>
                <label for="cashMethodNameEdit" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
                <input type="text" id="cashMethodNameEdit" value="${currentName}" class="mt-1 block w-full rounded-md bg-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2" />
            </div>
        `;
		openModal("Edit Cash Method", formHtml, saveEditedCashMethod, id);
		document.getElementById("cashMethodNameEdit").value = currentName;
	}

	async function saveNewCashMethod() {
		const nameInput = document.getElementById("cashMethodName");
		const name = nameInput.value.trim();
		if (!name) {
			showToast("Cash method name cannot be empty.", "error");
			nameInput.focus();
			return;
		}

		const formData = new FormData();
		formData.append("operation", "addCashMethod");
		formData.append(
			"json",
			JSON.stringify({ cashMethod: name, userId: userId })
		);

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchCashMethods();
				closeModal();
			} else {
				showToast(response.data.error || "Failed to add cash method.", "error");
			}
		} catch (error) {
			console.error("Error adding cash method:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	async function saveEditedCashMethod(id) {
		const nameInput = document.getElementById("cashMethodNameEdit");
		const name = nameInput.value.trim();
		if (!name) {
			showToast("Cash method name cannot be empty.", "error");
			nameInput.focus();
			return;
		}

		const formData = new FormData();
		formData.append("operation", "editCashMethod");
		formData.append(
			"json",
			JSON.stringify({ cashMethodId: id, cashMethod: name })
		);

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchCashMethods();
				closeModal();
			} else {
				showToast(
					response.data.error || "Failed to update cash method.",
					"error"
				);
			}
		} catch (error) {
			console.error("Error editing cash method:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	async function deleteCashMethod(id) {
		const formData = new FormData();
		formData.append("operation", "deleteCashMethod");
		formData.append("json", JSON.stringify({ cashMethodId: id }));

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchCashMethods();
			} else {
				showToast(
					response.data.error || "Failed to delete cash method.",
					"error"
				);
			}
		} catch (error) {
			console.error("Error deleting cash method:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	// --- Status Requests --- (Placeholders - to be implemented similarly)
	async function fetchStatusRequests() {
		try {
			const formData = new FormData();
			formData.append("operation", "getStatusRequest");
			const response = await axios.post(API_URL, formData);
			if (response.data && Array.isArray(response.data)) {
				renderStatusRequests(response.data);
			} else if (response.data && response.data.error) {
				showToast(`Error: ${response.data.error}`, "error");
				statusRequestsContainer.innerHTML = `<p class="text-red-500">${response.data.error}</p>`;
			} else {
				statusRequestsContainer.innerHTML =
					"<p>No status requests found or error fetching data.</p>";
			}
		} catch (error) {
			console.error("Error fetching status requests:", error);
			showToast("Failed to fetch status requests.", "error");
			statusRequestsContainer.innerHTML =
				'<p class="text-red-500">Failed to load data. Check console for details.</p>';
		}
	}

	function renderStatusRequests(statusRequests) {
		if (!statusRequests.length) {
			statusRequestsContainer.innerHTML =
				'<p class="text-gray-500 dark:text-gray-400">No status requests configured yet.</p>';
			return;
		}
		statusRequestsContainer.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        ${statusRequests
													.map(
														(status) => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${status.statusR_name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button class="edit-status-request-btn text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" data-id="${status.statusR_id}" data-name="${status.statusR_name}" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-status-request-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" data-id="${status.statusR_id}" data-name="${status.statusR_name}" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `
													)
													.join("")}
                    </tbody>
                </table>
            </div>
        `;

		document.querySelectorAll(".edit-status-request-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const id = e.currentTarget.dataset.id;
				const name = e.currentTarget.dataset.name;
				openEditStatusRequestModal(id, name);
			});
		});

		document.querySelectorAll(".delete-status-request-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const id = e.currentTarget.dataset.id;
				const name = e.currentTarget.dataset.name;
				showDeleteConfirmModal("Status Request", id, name, deleteStatusRequest);
			});
		});
	}

	function openAddStatusRequestModal() {
		const formHtml = `
            <div>
                <label for="statusRequestName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
                <input type="text" id="statusRequestName" class="mt-1 block w-full rounded-md bg-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2" />
            </div>
        `;
		openModal("Add New Status Request", formHtml, saveNewStatusRequest);
	}

	function openEditStatusRequestModal(id, currentName) {
		const formHtml = `
            <div>
                <label for="statusRequestNameEdit" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
                <input type="text" id="statusRequestNameEdit" value="${currentName}" class="mt-1 block w-full rounded-md bg-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2" />
            </div>
        `;
		openModal("Edit Status Request", formHtml, saveEditedStatusRequest, id);
		document.getElementById("statusRequestNameEdit").value = currentName;
	}

	async function saveNewStatusRequest() {
		const nameInput = document.getElementById("statusRequestName");
		const name = nameInput.value.trim();
		if (!name) {
			showToast("Status request name cannot be empty.", "error");
			nameInput.focus();
			return;
		}

		const formData = new FormData();
		formData.append("operation", "addStatusRequest");
		formData.append(
			"json",
			JSON.stringify({ statusRequest: name, userId: userId })
		);

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchStatusRequests();
				closeModal();
			} else {
				showToast(
					response.data.error || "Failed to add status request.",
					"error"
				);
			}
		} catch (error) {
			console.error("Error adding status request:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	async function saveEditedStatusRequest(id) {
		const nameInput = document.getElementById("statusRequestNameEdit");
		const name = nameInput.value.trim();
		if (!name) {
			showToast("Status request name cannot be empty.", "error");
			nameInput.focus();
			return;
		}

		const formData = new FormData();
		formData.append("operation", "editStatusRequest");
		formData.append(
			"json",
			JSON.stringify({ statusRequestId: id, statusRequest: name })
		);

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchStatusRequests();
				closeModal();
			} else {
				showToast(
					response.data.error || "Failed to update status request.",
					"error"
				);
			}
		} catch (error) {
			console.error("Error editing status request:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	async function deleteStatusRequest(id) {
		const formData = new FormData();
		formData.append("operation", "deleteStatusRequest");
		formData.append("json", JSON.stringify({ statusRequestId: id }));

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchStatusRequests();
			} else {
				showToast(
					response.data.error || "Failed to delete status request.",
					"error"
				);
			}
		} catch (error) {
			console.error("Error deleting status request:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	// --- User Levels --- (Placeholders - to be implemented similarly)
	async function fetchUserLevels() {
		try {
			const formData = new FormData();
			formData.append("operation", "getUserLevel");
			const response = await axios.post(API_URL, formData);
			if (response.data && Array.isArray(response.data)) {
				renderUserLevels(response.data);
			} else if (response.data && response.data.error) {
				showToast(`Error: ${response.data.error}`, "error");
				userLevelsContainer.innerHTML = `<p class="text-red-500">${response.data.error}</p>`;
			} else {
				userLevelsContainer.innerHTML =
					"<p>No user levels found or error fetching data.</p>";
			}
		} catch (error) {
			console.error("Error fetching user levels:", error);
			showToast("Failed to fetch user levels.", "error");
			userLevelsContainer.innerHTML =
				'<p class="text-red-500">Failed to load data. Check console for details.</p>';
		}
	}

	function renderUserLevels(userLevels) {
		if (!userLevels.length) {
			userLevelsContainer.innerHTML =
				'<p class="text-gray-500 dark:text-gray-400">No user levels configured yet.</p>';
			return;
		}
		userLevelsContainer.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        ${userLevels
													.map(
														(level) => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${
																	level.userL_name
																}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${
																	level.userL_desc || "N/A"
																}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button class="edit-user-level-btn text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" data-id="${
																			level.userL_id
																		}" data-name="${
															level.userL_name
														}" data-desc="${
															level.userL_desc || ""
														}" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-user-level-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" data-id="${
																			level.userL_id
																		}" data-name="${
															level.userL_name
														}" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `
													)
													.join("")}
                    </tbody>
                </table>
            </div>
        `;

		document.querySelectorAll(".edit-user-level-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const id = e.currentTarget.dataset.id;
				const name = e.currentTarget.dataset.name;
				const desc = e.currentTarget.dataset.desc;
				openEditUserLevelModal(id, name, desc);
			});
		});

		document.querySelectorAll(".delete-user-level-btn").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const id = e.currentTarget.dataset.id;
				const name = e.currentTarget.dataset.name;
				showDeleteConfirmModal("User Level", id, name, deleteUserLevel);
			});
		});
	}

	function openAddUserLevelModal() {
		const formHtml = `
            <div class="space-y-4">
                <div>
                    <label for="userLevelName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
                    <input type="text" id="userLevelName" class="mt-1 block w-full rounded-md bg-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2" />
                </div>
                <div>
                    <label for="userLevelDesc" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
                    <textarea id="userLevelDesc" rows="3" class="mt-1 block w-full rounded-md bg-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2"></textarea>
                </div>
            </div>
        `;
		openModal("Add New User Level", formHtml, saveNewUserLevel);
	}

	function openEditUserLevelModal(id, currentName, currentDesc) {
		const formHtml = `
            <div class="space-y-4">
                <div>
                    <label for="userLevelNameEdit" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
                    <input type="text" id="userLevelNameEdit" value="${currentName}" class="mt-1 block w-full rounded-md bg-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2" />
                </div>
                <div>
                    <label for="userLevelDescEdit" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
                    <textarea id="userLevelDescEdit" rows="3" class="mt-1 block w-full rounded-md bg-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2">${currentDesc}</textarea>
                </div>
            </div>
        `;
		openModal("Edit User Level", formHtml, saveEditedUserLevel, id);
		// Values are set directly in the HTML string for textarea, but can be set via JS too if needed.
	}

	async function saveNewUserLevel() {
		const nameInput = document.getElementById("userLevelName");
		const descInput = document.getElementById("userLevelDesc");
		const name = nameInput.value.trim();
		const desc = descInput.value.trim();

		if (!name) {
			showToast("User level name cannot be empty.", "error");
			nameInput.focus();
			return;
		}

		const formData = new FormData();
		formData.append("operation", "addUserLevel");
		formData.append(
			"json",
			JSON.stringify({ userLevel: name, desc: desc, userId: userId })
		);

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchUserLevels();
				closeModal();
			} else {
				showToast(response.data.error || "Failed to add user level.", "error");
			}
		} catch (error) {
			console.error("Error adding user level:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	async function saveEditedUserLevel(id) {
		const nameInput = document.getElementById("userLevelNameEdit");
		const descInput = document.getElementById("userLevelDescEdit");
		const name = nameInput.value.trim();
		const desc = descInput.value.trim();

		if (!name) {
			showToast("User level name cannot be empty.", "error");
			nameInput.focus();
			return;
		}

		const formData = new FormData();
		formData.append("operation", "editUserLevel");
		formData.append(
			"json",
			JSON.stringify({ userLevelId: id, userLevel: name, userLevelDesc: desc })
		);

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchUserLevels();
				closeModal();
			} else {
				showToast(
					response.data.error || "Failed to update user level.",
					"error"
				);
			}
		} catch (error) {
			console.error("Error editing user level:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	async function deleteUserLevel(id) {
		const formData = new FormData();
		formData.append("operation", "deleteUserLevel");
		formData.append("json", JSON.stringify({ userLevelId: id }));

		try {
			const response = await axios.post(API_URL, formData);
			if (response.data && response.data.success) {
				showToast(response.data.success, "success");
				fetchUserLevels();
			} else {
				showToast(
					response.data.error || "Failed to delete user level.",
					"error"
				);
			}
		} catch (error) {
			console.error("Error deleting user level:", error);
			showToast("An error occurred. Please try again.", "error");
		}
	}

	// --- Initial Fetch and Event Listeners ---
	if (addCashMethodBtn) {
		addCashMethodBtn.addEventListener("click", openAddCashMethodModal);
	}
	if (addStatusRequestBtn) {
		addStatusRequestBtn.addEventListener("click", openAddStatusRequestModal);
	}
	if (addUserLevelBtn) {
		addUserLevelBtn.addEventListener("click", openAddUserLevelModal);
	}

	// Initial data fetch
	fetchCashMethods();
	fetchStatusRequests();
	fetchUserLevels();
});
