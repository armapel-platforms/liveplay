document.addEventListener('DOMContentLoaded', () => {

    // Global click listener for password visibility toggles
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('visibility-toggle')) {
            const targetId = e.target.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (!targetInput) return;
            const isPassword = targetInput.type === 'password';
            targetInput.type = isPassword ? 'text' : 'password';
            e.target.textContent = isPassword ? 'visibility' : 'visibility_off';
        }
    });

    // --- Account Page Specific Logic ---
    const accountCard = document.querySelector('.account-card');
    if (accountCard) {
        const saveChangesBtn = document.getElementById('save-changes-button');

        // Function to populate user data into the fields
        const populateAccountInfo = (user) => {
            if (!user) return;
            document.querySelector('[data-field="first_name"] .row-value').textContent = user.first_name || 'Not set';
            document.querySelector('[data-field="middle_name"] .row-value').textContent = user.middle_name || 'Not set';
            document.querySelector('[data-field="last_name"] .row-value').textContent = user.last_name || 'Not set';
            document.querySelector('[data-field="username"] .row-value').textContent = user.username || 'Not set';
            document.querySelector('[data-field="email"] .row-value').textContent = user.email || '';
        };

        // Function to initialize the page
        const initializeAccountPage = async () => {
            const user = await window.auth.getCurrentUser();
            if (!user) {
                window.location.href = '/home/login'; // Redirect if not logged in
                return;
            }
            populateAccountInfo(user);
        };

        // Add listeners to all 'edit' icons
        document.querySelectorAll('.edit-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const activeEditingRow = document.querySelector('.account-row.editing');
                const clickedRow = e.target.closest('.account-row');

                if (activeEditingRow && activeEditingRow !== clickedRow) {
                    return alert("Please save or cancel your current change first.");
                }

                clickedRow.classList.toggle('editing');
                const isEditing = clickedRow.classList.contains('editing');
                
                const visibilityToggle = clickedRow.querySelector('.visibility-toggle');
                if (visibilityToggle) {
                    visibilityToggle.style.display = isEditing ? 'inline-flex' : 'none';
                }

                saveChangesBtn.style.display = document.querySelector('.account-row.editing') ? 'block' : 'none';
                
                if (isEditing) {
                    const input = clickedRow.querySelector('.row-input');
                    const value = (clickedRow.dataset.field === 'password') ? '' : clickedRow.querySelector('.row-value').textContent;
                    input.value = (value === 'Not set') ? '' : value;
                    input.focus();
                }
            });
        });

        // Add listener for the 'Save Changes' button
        if(saveChangesBtn) {
            saveChangesBtn.addEventListener('click', async () => {
                const activeEditingRow = document.querySelector('.account-row.editing');
                if (!activeEditingRow) return;

                const field = activeEditingRow.dataset.field;
                const input = activeEditingRow.querySelector('.row-input');
                const newValue = input.value.trim();
                let error;

                saveChangesBtn.disabled = true;
                saveChangesBtn.textContent = "Saving...";

                if (field === 'password') {
                    if (newValue) ({ error } = await window.auth.updateUserPassword(newValue));
                } else {
                    ({ error } = await window.auth.updateUserProfile({ [field]: newValue }));
                }

                if (error) {
                    alert(`Update failed: ${error.message}`);
                    saveChangesBtn.disabled = false;
                    saveChangesBtn.textContent = "Save Changes";
                } else {
                    alert('Account updated successfully!');
                    location.reload();
                }
            });
        }

        // Logout Button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await window.auth.logOut();
                window.location.href = '/home';
            });
        }

        // --- Delete Account Logic ---
        const deleteLink = document.getElementById('delete-account-link');
        const deleteSurvey = document.getElementById('delete-account-survey');
        if (deleteLink && deleteSurvey) {
            deleteLink.addEventListener('click', (e) => {
                e.preventDefault();
                deleteSurvey.style.display = (deleteSurvey.style.display === 'block') ? 'none' : 'block';
            });

            const finalDeleteBtn = document.getElementById('final-delete-button');
            const surveyForm = document.getElementById('delete-survey-form');
            const surveyOptions = document.querySelectorAll('.survey-option');
            const otherReasonContainer = document.querySelector('.other-reason-container');

            surveyOptions.forEach(option => {
                option.addEventListener('click', () => {
                    // Reset all options to their default state
                    surveyOptions.forEach(opt => {
                        opt.classList.remove('selected');
                        opt.querySelector('.material-symbols-outlined').textContent = 'check_box_outline_blank';
                    });

                    // Activate the clicked option
                    option.classList.add('selected');
                    option.querySelector('.material-symbols-outlined').textContent = 'check_box';
                    
                    // Show 'Other' text box if needed
                    const isOtherSelected = option.dataset.value === 'other';
                    otherReasonContainer.style.display = isOtherSelected ? 'block' : 'none';
                    if (isOtherSelected) {
                        document.getElementById('other-reason-text').focus();
                    }
                    
                    // Enable the delete button
                    finalDeleteBtn.disabled = false;
                });
            });

            // Handle the final deletion
            surveyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                finalDeleteBtn.disabled = true;
                finalDeleteBtn.textContent = "Deleting Permanently...";

                const selectedOption = document.querySelector('.survey-option.selected');
                const surveyData = {
                    reason: selectedOption.dataset.value,
                    other_text: (selectedOption.dataset.value === 'other') ? document.getElementById('other-reason-text').value.trim() : null
                };
                
                const { error } = await window.auth.deleteUserAccount(surveyData);

                if (error) {
                    alert(`Failed to delete account: ${error.message}. Please try again.`);
                    finalDeleteBtn.disabled = false;
                    finalDeleteBtn.textContent = "Delete My Account";
                } else {
                    alert("Your account has been permanently deleted.");
                    window.location.href = '/home'; // Redirect after deletion
                }
            });
        }
        
        // Initial call to load user data when the page loads
        initializeAccountPage();
    }
});
