document.addEventListener('DOMContentLoaded', () => {
    // --- Global Logic for Password Visibility Toggles ---
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

    // --- Login/Signup Page ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const signupForm = document.getElementById('signup-form');
        const showSignupLink = document.getElementById('show-signup');
        const showLoginLink = document.getElementById('show-login');
        const loginButton = document.getElementById('login-button');
        const signupButton = document.getElementById('signup-button');
        const otpModal = document.getElementById('otp-modal-overlay');

        showSignupLink.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('active'); loginForm.classList.remove('active'); });
        showLoginLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('active'); signupForm.classList.remove('active'); });
    
        loginButton.addEventListener('click', async () => {
            loginButton.disabled = true;
            loginButton.textContent = "Logging In...";
            try {
                const { error } = await window.auth.logIn({
                    email: document.getElementById('login-email').value,
                    password: document.getElementById('login-password').value
                });
                if (error) alert(`Login Failed: ${error.message}`);
                else window.location.href = '/account.html';
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = "Log In";
            }
        });

        signupButton.addEventListener('click', async () => {
            if (document.getElementById('signup-password').value !== document.getElementById('signup-confirm-password').value) return alert("Passwords do not match.");
            signupButton.disabled = true;
            signupButton.textContent = "Creating Account...";
            try {
                const credentials = {
                    first_name: document.getElementById('signup-firstname').value,
                    last_name: document.getElementById('signup-lastname').value,
                    email: document.getElementById('signup-email').value,
                    password: document.getElementById('signup-password').value,
                };
                const { data, error } = await window.auth.signUp(credentials);
                if (error) {
                    alert(`Sign Up Failed: ${error.message}`);
                } else if (data.user) {
                    // Check if email confirmation is required
                    if (data.user.identities && data.user.identities.length > 0) {
                         document.getElementById('otp-email-display').textContent = credentials.email;
                         otpModal.classList.add('active');
                         startOtpTimer(credentials.email, 'signup');
                    } else {
                        alert('Sign up successful! Please log in.');
                        showLoginLink.click();
                    }
                }
            } finally {
                signupButton.disabled = false;
                signupButton.textContent = "Create Account";
            }
        });

        document.getElementById('verify-otp-button').addEventListener('click', async () => {
            const email = document.getElementById('otp-email-display').textContent;
            const token = document.getElementById('otp-input').value;
            const { data, error } = await window.auth.verifyOtp(email, token);
            if (error) alert(`Verification Failed: ${error.message}`);
            else if (data.session) {
                alert("Account verified successfully! Welcome.");
                window.location.href = '/account.html';
            }
        });
    }

    // --- Forgot Password Page ---
    const resetPasswordButton = document.getElementById('send-reset-button');
    if(resetPasswordButton) {
        resetPasswordButton.addEventListener('click', async () => {
            const email = document.getElementById('reset-email').value;
            if (!email) return alert("Please enter your email address.");
            resetPasswordButton.disabled = true;
            resetPasswordButton.textContent = "Sending...";
            try {
                const { error } = await window.auth.sendPasswordResetOtp(email);
                if(error) alert(`Error: ${error.message}`);
                else alert("Password reset link sent! Please check your email.");
            } finally {
                resetPasswordButton.disabled = false;
                resetPasswordButton.textContent = "Send Reset Link";
            }
        });
    }

    // --- Account Page ---
    const accountCard = document.querySelector('.account-card');
    if (accountCard) {
        (async () => {
            const user = await window.auth.getCurrentUser();
            if (!user) return window.location.href = '/login-signup.html';

            document.querySelector('[data-field="first_name"] .row-value').textContent = user.first_name || 'Not set';
            document.querySelector('[data-field="last_name"] .row-value').textContent = user.last_name || 'Not set';
            document.querySelector('[data-field="email"] .row-value').textContent = user.email || '';

            document.querySelectorAll('.edit-icon').forEach(icon => {
                icon.addEventListener('click', (e) => {
                    const row = e.target.closest('.account-row');
                    const isEditing = row.classList.toggle('editing');
                    document.getElementById('save-changes-button').style.display = 'block';
                    if (isEditing) {
                        const input = row.querySelector('.row-input');
                        const valueSpan = row.querySelector('.row-value');
                        input.value = row.dataset.field === 'password' ? '' : valueSpan.textContent;
                        input.focus();
                    }
                });
            });

            document.getElementById('save-changes-button').addEventListener('click', async () => {
                const editingRow = document.querySelector('.account-row.editing');
                if (!editingRow) return;
                const field = editingRow.dataset.field;
                const newValue = editingRow.querySelector('.row-input').value.trim();
                if (!newValue) return alert("Input cannot be empty.");

                const { error } = (field === 'password')
                    ? await window.auth.updateUserPassword(newValue)
                    : await window.auth.updateUserProfile({ [field]: newValue });
                if (error) alert(`Update failed: ${error.message}`);
                else window.location.reload();
            });

            document.getElementById('logout-button').addEventListener('click', async () => {
                await window.auth.logOut();
                window.location.href = '/login-signup.html';
            });

            const deleteSurvey = document.getElementById('delete-account-survey');
            document.getElementById('delete-account-link').addEventListener('click', (e) => {
                e.preventDefault();
                deleteSurvey.style.display = (deleteSurvey.style.display === 'block') ? 'none' : 'block';
            });

            const finalDeleteBtn = document.getElementById('final-delete-button');
            document.querySelectorAll('.material-checkbox-label').forEach(label => {
                label.addEventListener('click', (e) => {
                    e.preventDefault();
                    label.classList.toggle('checked');
                    
                    const icon = label.querySelector('.material-symbols-outlined');
                    icon.textContent = label.classList.contains('checked') ? 'check_box' : 'check_box_outline_blank';
            
                    if (label.dataset.value === 'other') {
                        const otherReasonContainer = document.querySelector('.other-reason-container');
                        otherReasonContainer.style.display = label.classList.contains('checked') ? 'block' : 'none';
                    }
                    
                    finalDeleteBtn.disabled = !document.querySelector('.material-checkbox-label.checked');
                });
            });
            
            document.getElementById('delete-survey-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                if (confirm("Are you sure? This action is permanent and cannot be undone.")) {
                    finalDeleteBtn.disabled = true;
                    finalDeleteBtn.textContent = "Deleting...";
                    try {
                        const { error } = await window.auth.deleteUserAccount();
                        if (error) {
                            alert(`Deletion failed: ${error.message}`);
                        } else {
                            alert("Your account has been permanently deleted.");
                            window.location.href = '/login-signup.html';
                        }
                    } finally {
                         finalDeleteBtn.disabled = false;
                         finalDeleteBtn.textContent = "Permanently Delete My Account";
                    }
                }
            });
        })();
    }

    // --- Reusable OTP Timer Function ---
    const startOtpTimer = (email, type) => {
        const timerEl = document.getElementById('timer');
        const resendLink = document.getElementById('resend-otp-link');
        const timerDisplay = document.getElementById('timer-display');
        let countdown = 60;
        
        timerDisplay.style.display = 'block';
        resendLink.style.display = 'none';

        const interval = setInterval(() => {
            countdown--;
            timerEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                timerDisplay.style.display = 'none';
                resendLink.style.display = 'block';
            }
        }, 1000);

        if (!resendLink.dataset.listener) {
            resendLink.dataset.listener = 'true';
            resendLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const { error } = await window.auth.resendOtp(email);
                if (error) alert(`Failed to resend code: ${error.message}`);
                else alert(`A new code has been sent to ${email}.`);
            });
        }
    };
});
