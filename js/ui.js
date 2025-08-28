document.addEventListener('DOMContentLoaded', () => {

    // --- Universal Event Listeners ---
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('visibility-toggle')) {
            const targetId = e.target.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (!targetInput) return;
            targetInput.type = (targetInput.type === 'password') ? 'text' : 'password';
            e.target.textContent = (targetInput.type === 'password') ? 'visibility_off' : 'visibility';
        }
    });

    // --- Login / Signup Page Logic ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const signupForm = document.getElementById('signup-form');
        const showSignupLink = document.getElementById('show-signup');
        const showLoginLink = document.getElementById('show-login');

        function showFormBasedOnUrl() {
            if (window.location.pathname.includes('/signup')) {
                loginForm.classList.remove('active');
                signupForm.classList.add('active');
            } else {
                signupForm.classList.remove('active');
                loginForm.classList.add('active');
            }
        }
        
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
            window.history.pushState({}, '', '/home/signup');
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.classList.remove('active');
            loginForm.classList.add('active');
            window.history.pushState({}, '', '/home/login');
        });

        showFormBasedOnUrl();
    }
    
    // --- Account Page Logic ---
    const accountPage = document.querySelector('.account-container');
    if (accountPage) {
        const passwordChangeRow = document.querySelector('.password-change-row');
        const passwordFormContainer = document.querySelector('.password-form-container');
        const saveChangesBtn = document.getElementById('save-changes-button');

        // Toggle visibility of the password change form
        passwordChangeRow.querySelector('.edit-icon').addEventListener('click', () => {
            const isCurrentlyEditing = passwordChangeRow.classList.contains('editing');
            
            // Close any other open edit fields first
            document.querySelectorAll('.account-row.editing').forEach(row => row.classList.remove('editing'));

            // Toggle the password row's state
            passwordChangeRow.classList.toggle('editing', !isCurrentlyEditing);
            const isNowEditing = passwordChangeRow.classList.contains('editing');
            
            passwordFormContainer.style.display = isNowEditing ? 'block' : 'none';
            saveChangesBtn.style.display = isNowEditing ? 'block' : 'none';
        });

        // Handle profile field editing (first name, etc.)
        document.querySelectorAll('.account-row:not(.password-change-row) .edit-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                // Close other edit forms (including password)
                document.querySelectorAll('.account-row.editing').forEach(row => row.classList.remove('editing'));
                passwordFormContainer.style.display = 'none';

                const clickedRow = e.target.closest('.account-row');
                clickedRow.classList.add('editing');
                
                const input = clickedRow.querySelector('.row-input');
                const value = clickedRow.querySelector('.row-value').textContent;
                input.value = (value === 'Not set') ? '' : value;
                input.focus();
                
                saveChangesBtn.style.display = 'block';
            });
        });

        // Save Changes Button Logic (handles both profile and password)
        if (saveChangesBtn) {
            saveChangesBtn.addEventListener('click', async () => {
                saveChangesBtn.disabled = true;
                saveChangesBtn.textContent = "Saving...";

                let error;

                // Check if we are saving a password change
                if (passwordChangeRow.classList.contains('editing')) {
                    const newPass = document.getElementById('account-new-password').value;
                    const confirmPass = document.getElementById('account-confirm-password').value;

                    if (!newPass || newPass !== confirmPass) {
                        alert("Passwords do not match or are empty.");
                        saveChangesBtn.disabled = false;
                        saveChangesBtn.textContent = "Save Changes";
                        return;
                    }
                    ({ error } = await window.auth.updateUserPassword(newPass));
                } 
                // Check if we are saving a profile field change
                else {
                    const activeEditRow = document.querySelector('.account-row.editing');
                    if(activeEditRow) {
                        const field = activeEditRow.dataset.field;
                        const newValue = activeEditRow.querySelector('.row-input').value.trim();
                        ({ error } = await window.auth.updateUserProfile({ [field]: newValue }));
                    }
                }

                if (error) {
                    alert(`Update failed: ${error.message}`);
                } else {
                    alert('Account updated successfully!');
                    location.reload();
                }

                saveChangesBtn.disabled = false;
                saveChangesBtn.textContent = "Save Changes";
            });
        }

        // --- FIXED LOGOUT BUTTON ---
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                logoutButton.disabled = true;
                logoutButton.textContent = "Logging Out...";
                try {
                    await window.auth.logOut();
                } finally {
                    // This guarantees redirect even if server fails
                    window.location.href = '/home';
                }
            });
        }
        
        // --- FUNCTIONAL DELETE ACCOUNT ---
        const deleteLink = document.getElementById('delete-account-link');
        const deleteSurvey = document.getElementById('delete-account-survey');
        if (deleteLink && deleteSurvey) {
            deleteLink.addEventListener('click', (e) => {
                e.preventDefault();
                deleteSurvey.style.display = (deleteSurvey.style.display === 'block') ? 'none' : 'block';
            });

            const finalDeleteBtn = document.getElementById('final-delete-button');
            const surveyForm = document.getElementById('delete-survey-form');
            
            if (surveyForm) {
                surveyForm.addEventListener('change', () => {
                    const isReasonSelected = Array.from(surveyForm.querySelectorAll('input[type="checkbox"]')).some(cb => cb.checked);
                    finalDeleteBtn.disabled = !isReasonSelected;
                });
            }

            finalDeleteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm("Are you absolutely sure? This action cannot be undone and your account will be permanently deleted.")) {
                    finalDeleteBtn.disabled = true;
                    finalDeleteBtn.textContent = "Deleting...";

                    const { error } = await window.auth.deleteUserAccount();

                    if (error) {
                        alert(`Account deletion failed: ${error.message}. Please try again.`);
                        finalDeleteBtn.disabled = false;
                        finalDeleteBtn.textContent = "Delete My Account";
                    } else {
                        alert("Your account has been successfully deleted.");
                        window.location.href = '/home';
                    }
                }
            });
        }

        // Initialize Page Data
        const initializeAccountPage = async () => {
            const user = await window.auth.getCurrentUser();
            if (!user) return window.location.href = '/home/login';
            
            document.querySelector('[data-field="first_name"] .row-value').textContent = user.first_name || 'Not set';
            document.querySelector('[data-field="last_name"] .row-value').textContent = user.last_name || 'Not set';
            document.querySelector('[data-field="username"] .row-value').textContent = user.username || 'Not set';
            document.querySelector('[data-field="email"] .row-value').textContent = user.email || '';
        };
        initializeAccountPage();
    }
});
