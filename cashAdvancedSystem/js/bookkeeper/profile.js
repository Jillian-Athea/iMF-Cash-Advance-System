// Profile Modal Functionality
function initProfileModal() {
	const API_URL = "http://localhost/cashAdvancedSystem/php/bookkeeper.php";
	const profileModal = document.getElementById("profileModal");
	const profileForm = document.getElementById("profileForm");
	const closeProfileModal = document.getElementById("closeProfileModal");
	const cancelProfileEdit = document.getElementById("cancelProfileEdit");
	const viewProfileBtn = document.getElementById("viewProfileBtn");

	// Show Profile Modal
	viewProfileBtn.addEventListener("click", function (e) {
		e.preventDefault();
		loadUserProfile();
		profileModal.classList.remove("hidden");
	});

	// Close Profile Modal
	function closeModal() {
		if (profileModal) {
			profileModal.classList.add("hidden");
			if (profileForm) {
				profileForm.reset();
			}
		}
	}

	if (closeProfileModal) {
		closeProfileModal.addEventListener("click", closeModal);
	}
	if (cancelProfileEdit) {
		cancelProfileEdit.addEventListener("click", closeModal);
	}

	// Close modal when clicking outside
	if (profileModal) {
		profileModal.addEventListener("click", function (e) {
			if (e.target === profileModal) {
				closeModal();
			}
		});
	}

	// Load User Profile
	async function loadUserProfile() {
		try {
			const user = getSecureSession("user");
			if (!user || !user.user_id) {
				showToast("User session not found", "error");
				return;
			}

			const formData = new FormData();
			formData.append("operation", "getUserProfile");
			formData.append("json", JSON.stringify({ userId: user.user_id }));

			const response = await axios.post(API_URL, formData);
			console.log("Raw response:", response);
			const profileData = response.data;
			console.log("Parsed result:", profileData);

			if (profileData.error) {
				showToast(profileData.error, "error");
				return;
			}

			// Populate form fields
			if (profileForm) {
				document.getElementById("firstname").value =
					profileData.user_firstname || "";
				document.getElementById("lastname").value =
					profileData.user_lastname || "";
				document.getElementById("email").value = profileData.user_email || "";
				document.getElementById("phone").value = profileData.user_phone || "";
				document.getElementById("address").value =
					profileData.user_address || "";
				document.getElementById("username").value =
					profileData.user_username || "";
			}
		} catch (error) {
			console.error("Error loading profile:", error);
			showToast("Failed to load profile data", "error");
		}
	}

	// Handle Profile Form Submission
	if (profileForm) {
		profileForm.addEventListener("submit", async function (e) {
			e.preventDefault();
			console.log("Submitting profile form...");

			const newPassword = document.getElementById("newPassword").value;
			const confirmPassword = document.getElementById("confirmPassword").value;

			// Validate new password if provided
			if (newPassword || confirmPassword) {
				if (newPassword !== confirmPassword) {
					console.log("Validation failed: passwords do not match");
					showToast("New passwords do not match", "error");
					return;
				}
				if (newPassword.length < 6) {
					console.log("Validation failed: password too short");
					showToast("New password must be at least 6 characters long", "error");
					return;
				}
			}

			try {
				const user = getSecureSession("user");
				if (!user || !user.user_id) {
					console.log("Validation failed: user session not found");
					showToast("User session not found", "error");
					return;
				}

				const formData = new FormData();
				const profileData = {
					userId: user.user_id,
					user_firstname: document.getElementById("firstname").value,
					user_lastname: document.getElementById("lastname").value,
					user_email: document.getElementById("email").value,
					user_phone: document.getElementById("phone").value,
					user_address: document.getElementById("address").value,
					user_username: document.getElementById("username").value,
					currentPassword: document.getElementById("currentPassword").value,
					password:
						newPassword || document.getElementById("currentPassword").value,
				};
				console.log("Sending data:", profileData);

				formData.append("operation", "editUserProfile");
				formData.append("json", JSON.stringify(profileData));

				const response = await axios.post(API_URL, formData);
				console.log("Raw response:", response);
				const result = response.data;
				console.log("Parsed result:", result);

				if (result.error) {
					showToast(result.error, "error");
				} else if (result.incorrectPassword) {
					showToast(result.incorrectPassword, "error");
				} else if (result.success) {
					showToast("Profile updated successfully", "success");
					closeModal();

					// Update session data
					const updatedUser = {
						...user,
						user_firstname: profileData.user_firstname,
						user_lastname: profileData.user_lastname,
						user_email: profileData.user_email,
						user_phone: profileData.user_phone,
						user_address: profileData.user_address,
						user_username: profileData.user_username,
					};
					setSecureSession("user", updatedUser);

					// Update UI elements
					const initials =
						(profileData.user_firstname[0] || "") +
						(profileData.user_lastname[0] || "");
					const fullName = `${profileData.user_firstname} ${profileData.user_lastname}`;

					document.getElementById("userAvatar").textContent =
						initials.toUpperCase();
					document.getElementById("userFirstName").textContent =
						profileData.user_firstname;
					document.getElementById("userAvatarLarge").textContent =
						initials.toUpperCase();
					document.getElementById("userFullName").textContent = fullName;
					document.getElementById("userEmail").textContent =
						profileData.user_email || "No email available";
				}
			} catch (error) {
				console.error("Error updating profile:", error);
				showToast("Failed to update profile", "error");
			}
		});
	}

	// Load profile data when modal is shown
	if (profileModal) {
		const observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.attributeName === "class") {
					if (!profileModal.classList.contains("hidden")) {
						loadUserProfile();
					}
				}
			});
		});

		observer.observe(profileModal, {
			attributes: true,
		});
	}
}

// Toast Notification Function
function showToast(message, type = "success") {
	const toast = document.getElementById("toast");
	const toastMessage = document.getElementById("toastMessage");
	const toastIcon = document.getElementById("toastIcon");

	if (!toast || !toastMessage || !toastIcon) return;

	toastMessage.textContent = message;
	toast.classList.remove("hidden", "bg-green-500", "bg-red-500", "bg-blue-500");
	toastIcon.classList.remove(
		"fa-check-circle",
		"fa-times-circle",
		"fa-info-circle"
	);

	if (type === "success") {
		toast.classList.add("bg-green-100", "text-green-700");
		toastIcon.classList.add("fa-check-circle", "text-green-500");
	} else if (type === "error") {
		toast.classList.add("bg-red-100", "text-red-700");
		toastIcon.classList.add("fa-times-circle", "text-red-500");
	} else {
		toast.classList.add("bg-blue-100", "text-blue-700");
		toastIcon.classList.add("fa-info-circle", "text-blue-500");
	}

	toast.classList.remove("hidden");
	toast.classList.add("opacity-100");

	setTimeout(() => {
		toast.classList.add("opacity-0");
		setTimeout(() => toast.classList.add("hidden"), 300);
	}, 3000);
}

// Ensure initialization runs after script is loaded
initProfileModal();
