document.addEventListener('DOMContentLoaded', () => {
    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        const rect = button.getBoundingClientRect();

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add("ripple");

        const existingRipple = button.querySelector(".ripple");
        if (existingRipple) {
            existingRipple.remove();
        }

        button.appendChild(circle);

        circle.addEventListener('animationend', () => {
            if (circle.parentNode) {
                circle.remove();
            }
        });
    }

    document.querySelectorAll('.auth-btn').forEach(button => {
        button.addEventListener('click', createRipple);
    });

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
                else window.location.href = '/home';
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
            const { data, error } = await window.auth.verifyOtp(email, token, 'signup');
            if (error) alert(`Verification Failed: ${error.message}`);
            else if (data.session) {
                alert("Account verified successfully! Welcome.");
                window.location.href = '/home';
            }
        });
    }

    const emailRequestForm = document.getElementById('email-request-form');
    if (emailRequestForm) {
        const newPasswordForm = document.getElementById('new-password-form');
        const otpModal = document.getElementById('otp-modal-overlay');
        const sendOtpButton = document.getElementById('send-otp-button');
        const verifyOtpButton = document.getElementById('verify-otp-button');
        const doneButton = document.getElementById('done-button');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-new-password');
        const otpInput = document.getElementById('otp-input');

        otpInput.addEventListener('input', () => {
            verifyOtpButton.disabled = otpInput.value.length !== 6;
        });

        sendOtpButton.addEventListener('click', async () => {
            const email = document.getElementById('reset-email').value.trim();
            if (!email) return alert("Please enter your email address.");
            sendOtpButton.disabled = true;
            sendOtpButton.textContent = "Sending...";
            try {
                const { error } = await window.auth.sendPasswordResetOtp(email);
                if (error) {
                    alert(`Error: ${error.message}`);
                } else {
                    document.getElementById('otp-email-display').textContent = email;
                    otpModal.classList.add('active');
                    startOtpTimer(email, 'recovery');
                }
            } finally {
                sendOtpButton.disabled = false;
                sendOtpButton.textContent = "Send Verification Code";
            }
        });

        verifyOtpButton.addEventListener('click', async () => {
            const email = document.getElementById('otp-email-display').textContent;
            const token = otpInput.value.trim();
            if (token.length !== 6) return;
            verifyOtpButton.disabled = true;
            verifyOtpButton.textContent = "Verifying...";
            try {
                const { data, error } = await window.auth.verifyOtp(email, token, 'recovery');
                if (error) {
                    alert(`Verification Failed: ${error.message}`);
                } else if (data && data.user) {
                    alert("Verification successful! Please create your new password.");
                    otpModal.classList.remove('active');
                    emailRequestForm.classList.remove('active');
                    newPasswordForm.classList.add('active');
                } else {
                    alert("Verification failed. The code may be incorrect or expired.");
                }
            } finally {
                verifyOtpButton.disabled = false;
                verifyOtpButton.textContent = "Reset Password";
            }
        });

        const validateNewPasswords = () => {
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            doneButton.disabled = !(newPassword && newPassword === confirmPassword);
        };
        newPasswordInput.addEventListener('input', validateNewPasswords);
        confirmPasswordInput.addEventListener('input', validateNewPasswords);
        
        doneButton.addEventListener('click', async () => {
            const newPassword = newPasswordInput.value;
            doneButton.disabled = true;
            doneButton.textContent = "Saving...";
            try {
                const { error } = await window.auth.updateUserPassword(newPassword);
                if (error) {
                    alert(`Update failed: ${error.message}`);
                } else {
                    alert("Password updated successfully! You can now log in.");
                    window.location.href = '/home';
                }
            } finally {
                doneButton.disabled = false;
                doneButton.textContent = "Done";
            }
        });
    }

    const accountCard = document.querySelector('.account-card');
    if (accountCard) {
        (async () => {
            const user = await window.auth.getCurrentUser();
            if (!user) return window.location.href = '/home/login-signup';
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
                const saveButton = document.getElementById('save-changes-button');
                const editingRow = document.querySelector('.account-row.editing');
                if (!editingRow) return;

                const field = editingRow.dataset.field;
                const newValue = editingRow.querySelector('.row-input').value.trim();
                if (!newValue) {
                    alert("Input cannot be empty.");
                    return;
                }
                
                saveButton.disabled = true;
                saveButton.textContent = "Saving changes...";
                try {
                    const { error } = (field === 'password') ?
                        await window.auth.updateUserPassword(newValue) :
                        await window.auth.updateUserProfile({ [field]: newValue });
                    if (error) {
                        alert(`Update failed: ${error.message}`);
                    } else {
                        window.location.reload();
                    }
                } finally {
                    saveButton.disabled = false;
                    saveButton.textContent = "Save Changes";
                }
            });

            document.getElementById('logout-button').addEventListener('click', async () => {
                const logoutButton = document.getElementById('logout-button');
                logoutButton.disabled = true;
                logoutButton.textContent = "Logging out..."; // Changed text
                await window.auth.logOut();
                window.location.href = '/home';
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
                        document.querySelector('.other-reason-container').style.display = label.classList.contains('checked') ? 'block' : 'none';
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
                            window.location.href = '/home';
                        }
                    } finally {
                        finalDeleteBtn.disabled = false;
                        finalDeleteBtn.textContent = "Permanently Delete My Account";
                    }
                }
            });
        })();
    }

    const startOtpTimer = (email, type) => {
        const timerEl = document.getElementById('timer');
        const resendLink = document.getElementById('resend-otp-link');
        const timerDisplay = document.getElementById('timer-display');
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
        if (!resendLink.dataset.listenerAttached) {
            resendLink.dataset.listenerAttached = 'true';
            resendLink.addEventListener('click', async (e) => {
                e.preventDefault();
                if (resendLink.classList.contains('disabled')) return;
                const { error } = await window.auth.resendOtp(email, type);
                if (error) {
                    alert(`Failed to resend code: ${error.message}`);
                } else {
                    alert(`A new code has been sent to ${email}.`);
                    startOtpTimer(email, type);
                }
            });
        }
    };
});
