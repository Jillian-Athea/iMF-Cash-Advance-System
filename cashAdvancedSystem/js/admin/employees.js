let editingUserId = null;

// Function to fetch and display users
async function fetchUsers() {
	try {
		// Create FormData object
		const formData = new FormData();
		formData.append("operation", "getUsers");
		const response = await axios.post(
			"http://localhost/cashAdvancedSystem/php/admin.php",
			formData
		);

		// Check if response.data is already an object
		let users;
		if (typeof response.data === "string") {
			try {
				users = JSON.parse(response.data);
			} catch (parseError) {
				console.error("Error parsing JSON:", parseError);
			}
		} else {
			users = response.data;
		}

		window.currentUsers = users; // Store globally for editUser

		if (users && Array.isArray(users)) {
			displayUsers(users);
		} else if (users && users.error) {
			console.error("Server error:", users.error);
			const tbody = document.querySelector("tbody");
			tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-red-500">
                        ${users.error}
                    </td>
                </tr>
            `;
		} else {
			const tbody = document.querySelector("tbody");
			tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No users found
                    </td>
                </tr>
            `;
		}
	} catch (error) {
		console.error("Error fetching users:", error);
		const tbody = document.querySelector("tbody");
		tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-red-500">
                    Error loading users. Please try again later.
                </td>
            </tr>
        `;
	}
}

// Function to display users in the table
function displayUsers(users) {
	const tbody = document.querySelector("tbody");
	tbody.innerHTML = ""; // Clear existing rows

	if (users.length === 0) {
		tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No users found
                </td>
            </tr>
        `;
		return;
	}

	users.forEach((user) => {
		const initials =
			(user.user_firstname[0] || "") + (user.user_lastname[0] || "");
		const row = `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap align-middle">
                    <div class="flex items-center space-x-3">
                        <div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-base">
                            ${initials.toUpperCase()}
                        </div>
                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">${
													user.user_firstname
												} ${user.user_lastname}</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap align-middle">
                    <span class="text-sm text-gray-900 dark:text-gray-100">${
											user.user_email
										}</span>
                </td>
                <td class="px-5 py-4 whitespace-nowrap align-middle">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        ${user.userL_name}
                    </span>
                </td>
                <td class="px-5 py-4 whitespace-nowrap align-middle">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
											user.user_status == 1
												? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
												: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
										}">
                        ${user.user_status == 1 ? "Active" : "Suspended"}
                    </span>
                </td>
                <td class="px-5 py-4 whitespace-nowrap align-middle">
                    <span class="text-sm text-gray-900 dark:text-gray-100">
                        ₱${formatNumber(Number(user.user_availableLimit) || 0)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap align-middle text-sm font-medium">
                    <button class="text-primary hover:text-secondary mr-3" title="Edit" onclick="editUser(${
											user.user_id
										})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800" title="Delete" onclick="deleteUser(${
											user.user_id
										})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
		tbody.innerHTML += row;
	});
}

// Format number as currency
function formatNumber(num) {
	return parseFloat(num).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

// Helper to set modal title
function setModalTitle(isEdit) {
	document.getElementById("modalTitle").textContent = isEdit
		? "Update User"
		: "Add New User";
}

// Function to fetch user levels
async function fetchUserLevels(afterLoadCallback) {
	try {
		const formData = new FormData();
		formData.append("operation", "getUserLevel");

		const response = await axios.post(
			"http://localhost/cashAdvancedSystem/php/admin.php",
			formData
		);

		let userLevels;
		if (typeof response.data === "string") {
			userLevels = JSON.parse(response.data);
		} else {
			userLevels = response.data;
		}

		const select = document.querySelector('select[name="userLevel"]');
		select.innerHTML = '<option value="">Select User Level</option>';

		userLevels.forEach((level) => {
			const option = document.createElement("option");
			option.value = level.userL_id;
			option.textContent = level.userL_name;
			select.appendChild(option);
		});

		if (afterLoadCallback) afterLoadCallback();
	} catch (error) {
		console.error("Error fetching user levels:", error);
		showToast("Error loading user levels. Please try again.", "error");
	}
}

// Function to open modal for editing a user
function editUser(userId) {
	const user = window.currentUsers.find((u) => u.user_id == userId);
	if (!user) return;

	document.getElementById("userId").value = user.user_id;
	document.querySelector('input[name="firstname"]').value = user.user_firstname;
	document.querySelector('input[name="lastname"]').value = user.user_lastname;
	document.querySelector('input[name="email"]').value = user.user_email;
	document.querySelector('input[name="contactNumber"]').value =
		user.user_contactNumber;
	document.querySelector('input[name="address"]').value = user.user_address;
	document.querySelector('input[name="username"]').value = user.user_username;
	document.querySelector('input[name="password"]').value = "";
	document.querySelector('input[name="availableLimit"]').value =
		user.user_availableLimit || 0;

	// Fetch user levels and set the value after loading
	fetchUserLevels(() => {
		document.querySelector('select[name="userLevel"]').value =
			user.userL_id || user.user_userLevel || "";
	});
	document.querySelector('select[name="status"]').value = user.user_status;
	document.getElementById("submitUserBtn").textContent = "Update User";
	setModalTitle(true);
	editingUserId = user.user_id;
	showAddUserModal(true); // pass true to indicate edit mode
}

// Function to handle user deletion
async function deleteUser(userId) {
	showDeleteConfirmModal(userId);
}

// Function to show delete confirmation modal
function showDeleteConfirmModal(userId) {
	const modal = document.getElementById("deleteConfirmModal");
	modal.classList.remove("hidden");
	modal.classList.add("flex");

	// Store the userId to be deleted
	modal.dataset.userId = userId;

	// Add event listeners for the buttons
	const confirmBtn = document.getElementById("confirmDelete");
	const cancelBtn = document.getElementById("cancelDelete");

	const handleConfirm = async () => {
		try {
			const requestData = new FormData();
			requestData.append("operation", "deleteUser");
			requestData.append("json", JSON.stringify({ userId: userId }));

			const response = await axios.post(
				"http://localhost/cashAdvancedSystem/php/admin.php",
				requestData
			);

			if (response.data.success) {
				showToast("User deleted successfully!", "success");
				fetchUsers(); // Refresh the users list
			} else {
				showToast(
					response.data.error || "Error deleting user. Please try again.",
					"error"
				);
			}
		} catch (error) {
			console.error("Error deleting user:", error);
			showToast("An unexpected error occurred. Please try again.", "error");
		} finally {
			hideDeleteConfirmModal();
		}
	};

	const handleCancel = () => {
		hideDeleteConfirmModal();
	};

	// Remove any existing event listeners
	confirmBtn.replaceWith(confirmBtn.cloneNode(true));
	cancelBtn.replaceWith(cancelBtn.cloneNode(true));

	// Add new event listeners
	document
		.getElementById("confirmDelete")
		.addEventListener("click", handleConfirm);
	document
		.getElementById("cancelDelete")
		.addEventListener("click", handleCancel);

	// Close modal when clicking outside
	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			hideDeleteConfirmModal();
		}
	});
}

// Function to hide delete confirmation modal
function hideDeleteConfirmModal() {
	const modal = document.getElementById("deleteConfirmModal");
	modal.classList.add("hidden");
	modal.classList.remove("flex");
	delete modal.dataset.userId;
}

// Function to show the add user modal (now also used for editing)
function showAddUserModal(isEdit) {
	const modal = document.getElementById("addUserModal");
	const passwordInput = document.getElementById("password");
	const passwordHelperText = document.getElementById("passwordHelperText");

	modal.classList.remove("hidden");
	modal.classList.add("flex");

	if (isEdit) {
		setModalTitle(true);
		fetchUserLevels(() => {
			// Populate userL_id for editing, this part is already in your editUser function
		});
		passwordInput.required = false;
		passwordHelperText.classList.remove("hidden");
	} else {
		setModalTitle(false);
		fetchUserLevels(); // Fetch for new user
		document.getElementById("addUserForm").reset(); // Ensure form is clean for add
		document.getElementById("userId").value = ""; // Ensure userId is cleared
		passwordInput.required = true;
		passwordHelperText.classList.add("hidden");
		editingUserId = null; // Ensure editingUserId is null for add mode
	}
}

// Function to hide the add user modal
function hideAddUserModal() {
	const modal = document.getElementById("addUserModal");
	const passwordInput = document.getElementById("password");
	const passwordHelperText = document.getElementById("passwordHelperText");

	modal.classList.add("hidden");
	modal.classList.remove("flex");
	document.getElementById("addUserForm").reset();
	document.getElementById("userId").value = "";

	// Reset password field to be required and helper text hidden for next potential "Add User" action
	passwordInput.required = true;
	passwordHelperText.classList.add("hidden");

	document.getElementById("submitUserBtn").textContent = "Add User";
	setModalTitle(false);
	editingUserId = null;
	removeModalError();
}

// Show error in modal
function showModalError(msg) {
	let err = document.getElementById("modalError");
	if (!err) {
		err = document.createElement("div");
		err.id = "modalError";
		err.className = "mb-2 text-red-600 text-sm";
		document.getElementById("addUserForm").prepend(err);
	}
	err.textContent = msg;
}
function removeModalError() {
	const err = document.getElementById("modalError");
	if (err) err.remove();
}

// Function to handle form submission (add or edit)
async function handleAddUser(event) {
	event.preventDefault();
	removeModalError();

	const form = event.target;
	const formData = new FormData(form);

	// Create the user data object
	const userData = {
		firstname: formData.get("firstname").trim(),
		lastname: formData.get("lastname").trim(),
		email: formData.get("email").trim().toLowerCase(),
		contactNumber: formData.get("contactNumber"),
		address: formData.get("address"),
		username: formData.get("username").trim().toLowerCase(),
		password: formData.get("password"),
		userLevel: formData.get("userLevel"),
		status: formData.get("status"),
		available_limit: Number(formData.get("availableLimit")) || 0,
	};

	let operation = "addUser";
	if (editingUserId) {
		userData.userId = editingUserId;
		operation = "editUser";
	}

	// Validation for duplicates
	const duplicate = window.currentUsers.find((u) => {
		if (editingUserId && u.user_id == editingUserId) return false; // skip self
		return (
			u.user_email.toLowerCase() === userData.email ||
			u.user_username.toLowerCase() === userData.username ||
			((u.user_firstname + "").trim().toLowerCase() === userData.firstname &&
				(u.user_lastname + "").trim().toLowerCase() === userData.lastname)
		);
	});
	if (duplicate) {
		showModalError(
			"A user with the same email, username, or name already exists."
		);
		return;
	}

	try {
		const requestData = new FormData();
		requestData.append("operation", operation);
		requestData.append("json", JSON.stringify(userData));

		const response = await axios.post(
			"http://localhost/cashAdvancedSystem/php/admin.php",
			requestData
		);

		if (response.data.success) {
			showToast(
				editingUserId
					? "User updated successfully!"
					: "User added successfully!",
				"success"
			);
			hideAddUserModal();
			fetchUsers(); // Refresh the users list
		} else {
			showModalError(
				response.data.error || "Error saving user. Please try again."
			);
		}
	} catch (error) {
		console.error("Error saving user:", error);
		showToast("Error saving user. Please try again.", "error");
	} finally {
		editingUserId = null;
		document.getElementById("submitUserBtn").textContent = "Add User";
	}
}

// Display user info in navbar
function displayUserInfo() {
	const user = getSecureSession("user");
	if (user) {
		const initials =
			(user.user_firstname?.[0] || "") + (user.user_lastname?.[0] || "");
		const userAvatar = document.getElementById("userAvatar");
		const userFirstName = document.getElementById("userFirstName");

		if (userAvatar) {
			userAvatar.textContent = initials.toUpperCase();
		}

		if (userFirstName) {
			userFirstName.textContent = user.user_firstname || "";
			userFirstName.classList.remove("hidden");
			userFirstName.classList.add("md:block");
		}
	}
}

// Add event listeners when the document loads
document.addEventListener("DOMContentLoaded", () => {
	fetchUsers();
	displayUserInfo();

	// Add User Modal Event Listeners
	const addUserBtn = document.getElementById("addUserBtn");
	const closeModalBtn = document.getElementById("closeModal");
	const cancelAddUserBtn = document.getElementById("cancelAddUser");
	const addUserForm = document.getElementById("addUserForm");

	addUserBtn.addEventListener("click", () => showAddUserModal(false));
	closeModalBtn.addEventListener("click", hideAddUserModal);
	cancelAddUserBtn.addEventListener("click", hideAddUserModal);
	addUserForm.addEventListener("submit", handleAddUser);

	// Remove the click outside event listener
	// document.getElementById("addUserModal").addEventListener("click", (e) => {
	//     if (e.target === e.currentTarget) {
	//         hideAddUserModal();
	//     }
	// });
});

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