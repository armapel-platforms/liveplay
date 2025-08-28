document.addEventListener('DOMContentLoaded', () => {

    // --- Universal UI Helpers ---

    // Password visibility toggler for any page
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('visibility-toggle')) {
            const targetId = e.target.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                const isPassword = targetInput.type === 'password';
                targetInput.type = isPassword ? 'text' : 'password';
                e.target.textContent = isPassword ? 'visibility' : 'visibility_off';
            }
        }
    });

    // --- OTP Timer and Resend Logic ---
    const startOtpTimer = (email, type) => {
        const timerEl = document.getElementById('timer');
        const resendLink = document.getElementById('resend-otp-link');
        const timerDisplay = document.getElementById('timer-display');
        if (!timerEl || !resendLink || !timerDisplay) return;

        let countdown = 60;
        timerDisplay.style.display = 'block';
        resendLink.style.display = 'none';
        resendLink.classList.add('disabled');
        
        const interval = setInterval(() => {
            countdown--;
            timerEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                timerDisplay.style.display = 'none';
                resendLink.style.display = 'block';
                resendLink.classList.remove('disabled');
            }
        }, 1000);

        // Attach event listener only once
        if (!resendLink.dataset.listenerAttached) {
            resendLink.addEventListener('click', async (e) => {
                e.preventDefault();
                if(resendLink.classList.contains('disabled')) return;
                
                let resendError;
                if (type === 'recovery') {
                    ({ error: resendError } = await window.auth.sendPasswordResetOtp(email));
                } else {
                    ({ error: resendError } = await window.auth.resendOtp(email));
                }

                if (resendError) {
                    alert(`Failed to resend code: ${resendError.message}`);
                } else {
                    alert(`A new code has been sent to ${email}.`);
                    startOtpTimer(email, type);
                }
            });
            resendLink.dataset.listenerAttached = 'true';
        }
    };


    // --- LOGIN / SIGNUP PAGE LOGIC ---

    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            if (!email || !password) return alert("Please enter both email and password.");
            
            loginButton.disabled = true;
            loginButton.textContent = "Logging In...";
            try {
                const { error } = await window.auth.logIn({ email, password });
                if (error) {
                    alert(`Login Failed: ${error.message}`);
                } else {
                    window.location.href = '/home';
                }
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = "Log In";
            }
        });
    }

    const signupButton = document.getElementById('signup-button');
    if (signupButton) {
        signupButton.addEventListener('click', async () => {
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            if (password !== confirmPassword) return alert("Passwords do not match.");
            
            const credentials = {
                first_name: document.getElementById('signup-firstname').value.trim(),
                middle_name: document.getElementById('signup-middlename').value.trim(),
                last_name: document.getElementById('signup-lastname').value.trim(),
                username: document.getElementById('signup-username').value.trim(),
                email: document.getElementById('signup-email').value.trim(),
                password: password
            };
            
            if (!credentials.first_name || !credentials.last_name || !credentials.username || !credentials.email || !credentials.password) {
                return alert("Please fill out all required fields.");
            }
            if (credentials.middle_name === '') delete credentials.middle_name;
            
            signupButton.disabled = true;
            signupButton.textContent = "Creating Account...";
            try {
                const { data, error } = await window.auth.signUp(credentials);
                if (error) {
                    alert(`Sign Up Failed: ${error.message}`);
                } else if (data.user) {
                    const otpModal = document.getElementById('otp-modal-overlay');
                    const otpEmailDisplay = document.getElementById('otp-email-display');
                    if(otpEmailDisplay) otpEmailDisplay.textContent = credentials.email;
                    if(otpModal) otpModal.classList.add('active');
                    startOtpTimer(credentials.email, 'signup');
                } else {
                    alert('An unknown error occurred during sign up.');
                }
            } finally {
                signupButton.disabled = false;
                signupButton.textContent = "Create Account";
            }
        });
    }

    const verifyOtpButtonLogin = document.getElementById('verify-otp-button');
    if (verifyOtpButtonLogin && window.location.pathname.includes('/login') || window.location.pathname.includes('/signup')) {
        verifyOtpButtonLogin.addEventListener('click', async () => {
            const email = document.getElementById('otp-email-display').textContent;
            const token = document.getElementById('otp-input').value.trim();
            if (token.length !== 6) return alert("Please enter a valid 6-digit OTP.");
            
            const { data, error } = await window.auth.verifyOtp(email, token);
            if (error) {
                alert(`Verification Failed: ${error.message}`);
            } else if (data.session) {
                alert("Account verified successfully! Welcome to Liveplay.");
                window.location.href = '/home';
            }
        });
    }


    // --- FORGOT PASSWORD PAGE LOGIC ---

    const sendOtpButton = document.getElementById('send-otp-button');
    if (sendOtpButton) {
        sendOtpButton.addEventListener('click', async () => {
            const userEmail = document.getElementById('reset-email').value.trim();
            if (!userEmail) return alert("Please enter your email address.");
            
            const { error } = await window.auth.sendPasswordResetOtp(userEmail);
            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                document.getElementById('otp-email-display').textContent = userEmail;
                document.getElementById('otp-modal-overlay').classList.add('active');
                startOtpTimer(userEmail, 'recovery');
            }
        });
    }

    const otpInput = document.getElementById('otp-input');
    const verifyOtpButtonPassword = document.getElementById('verify-otp-button');
    if (otpInput && verifyOtpButtonPassword && window.location.pathname.includes('/forgot-password')) {
        otpInput.addEventListener('input', () => {
            verifyOtpButtonPassword.disabled = otpInput.value.length !== 6;
        });

        verifyOtpButtonPassword.addEventListener('click', async () => {
            const userEmail = document.getElementById('otp-email-display').textContent;
            const token = otpInput.value;
            const { error } = await window.auth.verifyPasswordResetOtp(userEmail, token);

            if (error) {
                alert(`OTP Verification Failed: ${error.message}`);
            } else {
                document.getElementById('otp-modal-overlay').classList.remove('active');
                document.getElementById('email-request-form').classList.remove('active');
                document.getElementById('new-password-form').classList.add('active');
            }
        });
    }

    const doneButton = document.getElementById('done-button');
    if (doneButton) {
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-new-password');

        const validateNewPasswords = () => {
            const pass1 = newPasswordInput.value;
            const pass2 = confirmPasswordInput.value;
            doneButton.disabled = !(pass1 && pass1 === pass2);
        };
        newPasswordInput.addEventListener('input', validateNewPasswords);
        confirmPasswordInput.addEventListener('input', validateNewPasswords);

        doneButton.addEventListener('click', async () => {
            const newPassword = newPasswordInput.value;
            const { error } = await window.auth.updateUserPassword(newPassword);
            if (error) {
                alert(`Password Reset Failed: ${error.message}`);
            } else {
                alert("Password has been reset successfully. Please log in.");
                window.location.href = '/home/login';
            }
        });
    }


    // --- MY ACCOUNT PAGE LOGIC ---
    
    if (document.querySelector('.account-container')) {
        let currentUser = null;

        const populateAccountInfo = (user) => {
            if (!user) return;
            currentUser = user;
            document.querySelector('[data-field="first_name"] .row-value').textContent = user.first_name || 'Not set';
            document.querySelector('[data-field="middle_name"] .row-value').textContent = user.middle_name || 'Not set';
            document.querySelector('[data-field="last_name"] .row-value').textContent = user.last_name || 'Not set';
            document.querySelector('[data-field="username"] .row-value').textContent = user.username || 'Not set';
            document.querySelector('[data-field="email"] .row-value').textContent = user.email || '';
        };

        const initializeAccountPage = async () => {
            const user = await window.auth.getCurrentUser();
            if (!user) {
                window.location.href = '/home/login';
            } else {
                populateAccountInfo(user);
            }
        };

        const saveChangesBtn = document.getElementById('save-changes-button');

        document.querySelectorAll('.edit-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const activeEditingRow = document.querySelector('.account-row.editing');
                const clickedRow = e.target.closest('.account-row');
                if (activeEditingRow && activeEditingRow !== clickedRow) {
                    return alert("Please save or cancel your current change first.");
                }
                
                clickedRow.classList.toggle('editing');
                const isEditing = clickedRow.classList.contains('editing');
                if(saveChangesBtn) saveChangesBtn.style.display = isEditing ? 'block' : 'none';
                
                if (isEditing) {
                    const input = clickedRow.querySelector('.row-input');
                    const value = (clickedRow.dataset.field === 'password') ? '' : clickedRow.querySelector('.row-value').textContent;
                    input.value = (value === 'Not set') ? '' : value;
                    input.focus();
                }
            });
        });

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
                
                try {
                    switch(field) {
                        case 'password':
                            if (newValue) ({ error } = await window.auth.updateUserPassword(newValue));
                            break;
                        case 'email':
                            if (newValue && newValue !== currentUser.email) {
                                ({ error } = await window.auth.updateUserEmail(newValue));
                                if (!error) alert("A confirmation link has been sent to both your old and new email addresses.");
                            }
                            break;
                        default:
                            ({ error } = await window.auth.updateUserProfile({ [field]: newValue }));
                            break;
                    }

                    if (error) {
                        alert(`Update failed: ${error.message}`);
                    } else {
                        alert('Account updated successfully!');
                        location.reload();
                    }
                } finally {
                    saveChangesBtn.disabled = false;
                    saveChangesBtn.textContent = "Save Changes";
                }
            });
        }

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await window.auth.logOut();
                window.location.href = '/home';
            });
        }

        const deleteLink = document.getElementById('delete-account-link');
        const deleteSurvey = document.getElementById('delete-account-survey');
        if (deleteLink && deleteSurvey) {
            deleteLink.addEventListener('click', (e) => {
                e.preventDefault();
                deleteSurvey.style.display = (deleteSurvey.style.display === 'block') ? 'none' : 'block';
            });

            const surveyForm = document.getElementById('delete-survey-form');
            const finalDeleteBtn = document.getElementById('final-delete-button');
            const otherReasonCheckbox = document.querySelector('input[value="other"]');
            const otherReasonText = document.getElementById('other-reason-text');

            if (surveyForm && finalDeleteBtn) {
                surveyForm.addEventListener('change', () => {
                    const isReasonSelected = Array.from(surveyForm.querySelectorAll('input[type="checkbox"]')).some(cb => cb.checked);
                    finalDeleteBtn.disabled = !isReasonSelected;
                });
                surveyForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (confirm("Are you absolutely sure? This action cannot be undone and your account will be deleted permanently.")) {
                        finalDeleteBtn.disabled = true;
                        finalDeleteBtn.textContent = "Deleting...";
                        const { error } = await window.auth.deleteUserAccount();
                        if(error) {
                            alert(`Deletion failed: ${error.message}`);
                            finalDeleteBtn.disabled = false;
                            finalDeleteBtn.textContent = "Delete My Account";
                        } else {
                            alert("Your account has been deleted.");
                            window.location.href = '/home';
                        }
                    }
                });
            }
            if (otherReasonCheckbox && otherReasonText) {
                otherReasonCheckbox.addEventListener('change', () => {
                    otherReasonText.style.display = otherReasonCheckbox.checked ? 'block' : 'none';
                    if(otherReasonCheckbox.checked) otherReasonText.focus();
                });
            }
        }
        
        initializeAccountPage();
    }
});
