document.addEventListener('DOMContentLoaded', () => {

    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('visibility-toggle')) {
            const targetId = e.target.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (!targetInput) return;
            targetInput.type = (targetInput.type === 'password') ? 'text' : 'password';
            e.target.textContent = (targetInput.type === 'password') ? 'visibility_off' : 'visibility';
        }
    });

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const signupForm = document.getElementById('signup-form');
        const showSignupLink = document.getElementById('show-signup');
        const showLoginLink = document.getElementById('show-login');
        const loginButton = document.getElementById('login-button');
        const signupButton = document.getElementById('signup-button');
        const otpModal = document.getElementById('otp-modal-overlay');

        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.classList.remove('active');
                signupForm.classList.add('active');
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                signupForm.classList.remove('active');
                loginForm.classList.add('active');
            });
        }

        if (loginButton) {
            loginButton.addEventListener('click', async () => {
                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;
                if (!email || !password) return alert("Please enter both email and password.");
                loginButton.disabled = true;
                loginButton.textContent = "Logging In...";
                const { error } = await window.auth.logIn({ email, password });
                loginButton.disabled = false;
                loginButton.textContent = "Log In";
                if (error) {
                    alert(`Login Failed: ${error.message}`);
                } else {
                    window.location.href = 'index.html';
                }
            });
        }
        
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
                
                const { data, error } = await window.auth.signUp(credentials);
                
                signupButton.disabled = false;
                signupButton.textContent = "Create Account";
                
                if (error) {
                    alert(`Sign Up Failed: ${error.message}`);
                } else if (data.user) {
                    const otpEmailDisplay = document.getElementById('otp-email-display');
                    if (otpEmailDisplay) otpEmailDisplay.textContent = credentials.email;
                    if (otpModal) otpModal.classList.add('active');
                    if (loginForm) loginForm.style.display = 'none';
                    if (signupForm) signupForm.style.display = 'none';
                    startOtpTimer(credentials.email, 'signup');
                } else {
                    alert('An unknown error occurred.');
                }
            });
        }

        const verifyOtpButton = document.getElementById('verify-otp-button');
        if (verifyOtpButton) {
            verifyOtpButton.addEventListener('click', async () => {
                const email = document.getElementById('otp-email-display').textContent;
                const token = document.getElementById('otp-input').value;
                if (token.length !== 6) return alert("Please enter a valid 6-digit OTP.");
                const { data, error } = await window.auth.verifyOtp(email, token);
                if (error) {
                    alert(`Verification Failed: ${error.message}`);
                } else if (data.session) {
                    alert("Account verified successfully! Welcome to Liveplay.");
                    window.location.href = 'index.html';
                }
            });
        }
    }

    const emailRequestForm = document.getElementById('email-request-form');
    if (emailRequestForm) {
        const newPasswordForm = document.getElementById('new-password-form');
        const otpModal = document.getElementById('otp-modal-overlay');
        const sendOtpButton = document.getElementById('send-otp-button');
        const verifyOtpButton = document.getElementById('verify-otp-button');
        const doneButton = document.getElementById('done-button');
        const otpInput = document.getElementById('otp-input');
        let userEmail = '';

        sendOtpButton.addEventListener('click', async () => {
            userEmail = document.getElementById('reset-email').value.trim();
            if (!userEmail) return alert("Please enter your email address.");
            const { error } = await window.auth.sendPasswordResetOtp(userEmail);
            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                document.getElementById('otp-email-display').textContent = userEmail;
                otpModal.classList.add('active');
                startOtpTimer(userEmail, 'recovery');
            }
        });

        if (otpInput) {
            otpInput.addEventListener('input', () => {
                if (verifyOtpButton) verifyOtpButton.disabled = otpInput.value.length !== 6;
            });
        }

        if (verifyOtpButton) {
            verifyOtpButton.addEventListener('click', async () => {
                const token = otpInput.value;
                const { error } = await window.auth.verifyPasswordResetOtp(userEmail, token);
                if (error) {
                    alert(`OTP Verification Failed: ${error.message}`);
                } else {
                    otpModal.classList.remove('active');
                    emailRequestForm.classList.remove('active');
                    newPasswordForm.classList.add('active');
                }
            });
        }
        
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-new-password');

        if (newPasswordInput && confirmPasswordInput && doneButton) {
            const validateNewPasswords = () => {
                const pass1 = newPasswordInput.value;
                const pass2 = confirmPasswordInput.value;
                doneButton.disabled = !(pass1 && pass1 === pass2);
            };
            newPasswordInput.addEventListener('input', validateNewPasswords);
            confirmPasswordInput.addEventListener('input', validateNewPasswords);
        }

        if (doneButton) {
            doneButton.addEventListener('click', async () => {
                const newPassword = newPasswordInput.value;
                const { error } = await window.auth.updateUserPassword(newPassword);
                if (error) {
                    alert(`Password Reset Failed: ${error.message}`);
                } else {
                    alert("Password has been reset successfully. Please log in.");
                    window.location.href = 'login-signup.html';
                }
            });
        }
    }

    const startOtpTimer = (email, type) => {
        const timerEl = document.getElementById('timer');
        const resendLink = document.getElementById('resend-otp-link');
        const timerDisplay = document.getElementById('timer-display');
        let countdown = 60;
        if (!timerEl || !resendLink || !timerDisplay) return;

        timerDisplay.style.display = 'block';
        resendLink.style.display = 'none';
        
        const interval = setInterval(() => {
            countdown--;
            timerEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                timerDisplay.style.display = 'none';
                resendLink.classList.remove('disabled');
                resendLink.style.display = 'block';
            }
        }, 1000);

        if (!resendLink.dataset.listener) {
            resendLink.dataset.listener = 'true';
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
        }
    };
    
    if (document.body.contains(document.querySelector('.account-card'))) {
        const saveChangesBtn = document.getElementById('save-changes-button');
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
            if (!user) return window.location.href = 'login-signup.html';
            populateAccountInfo(user);
        };

        document.querySelectorAll('.edit-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const activeEditingRow = document.querySelector('.account-row.editing');
                const clickedRow = e.target.closest('.account-row');
                if (activeEditingRow && activeEditingRow !== clickedRow) return alert("Please save or cancel your current change first.");
                clickedRow.classList.toggle('editing');
                const isEditing = clickedRow.classList.contains('editing');
                saveChangesBtn.style.display = isEditing ? 'block' : 'none';
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
                    saveChangesBtn.disabled = false;
                    saveChangesBtn.textContent = "Save Changes";
                } else {
                    alert('Account updated successfully!');
                    location.reload();
                }
            });
        }

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await window.auth.logOut();
                window.location.href = 'index.html';
            });
        }

        const deleteLink = document.getElementById('delete-account-link');
        const deleteSurvey = document.getElementById('delete-account-survey');
        if (deleteLink && deleteSurvey) {
            deleteLink.addEventListener('click', (e) => {
                e.preventDefault();
                const isVisible = deleteSurvey.style.display === 'block';
                deleteSurvey.style.display = isVisible ? 'none' : 'block';
            });
            const finalDeleteBtn = document.getElementById('final-delete-button');
            const surveyForm = document.getElementById('delete-survey-form');
            const otherReasonCheckbox = document.querySelector('input[value="other"]');
            const otherReasonText = document.getElementById('other-reason-text');
            if (surveyForm) {
                surveyForm.addEventListener('change', () => {
                    const isReasonSelected = Array.from(surveyForm.querySelectorAll('input[type="checkbox"]')).some(cb => cb.checked);
                    finalDeleteBtn.disabled = !isReasonSelected;
                });
                surveyForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (confirm("Are you sure? This action cannot be undone.")) {
                        await window.auth.deleteUserAccount();
                        alert("Account deleted.");
                        window.location.href = 'index.html';
                    }
                });
            }
            if (otherReasonCheckbox && otherReasonText) {
                otherReasonCheckbox.addEventListener('change', () => {
                    otherReasonText.style.display = otherReasonCheckbox.checked ? 'block' : 'none';
                });
            }
        }
        
        initializeAccountPage();
    }
});