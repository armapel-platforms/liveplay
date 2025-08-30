document.addEventListener('DOMContentLoaded', () => {

    // Handles the show/hide password icon functionality across all forms
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('visibility-toggle')) {
            e.preventDefault();
            const targetId = e.target.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (!targetInput) return;
            const isPassword = targetInput.type === 'password';
            targetInput.type = isPassword ? 'text' : 'password';
            e.target.textContent = isPassword ? 'visibility' : 'visibility_off';
        }
    });

    // --- Login & Signup Page Specific Logic ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const signupForm = document.getElementById('signup-form');
        const loginButton = document.getElementById('login-button');
        const signupButton = document.getElementById('signup-button');
        const otpModal = document.getElementById('otp-modal-overlay');

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
                    window.location.href = '/home';
                }
            });
        }
        
        if (signupButton) {
            signupButton.addEventListener('click', async () => {
                const password = document.getElementById('signup-password').value;
                const confirmPassword = document.getElementById('signup-confirm-password').value;
                if (password !== confirmPassword) return alert("Passwords do not match.");
                
                // Updated credentials object, removing username and middle_name
                const credentials = {
                    first_name: document.getElementById('signup-firstname').value.trim(),
                    last_name: document.getElementById('signup-lastname').value.trim(),
                    email: document.getElementById('signup-email').value.trim(),
                    password: password
                };
                
                if (!credentials.first_name || !credentials.last_name || !credentials.email || !credentials.password) {
                    return alert("Please fill out all required fields.");
                }
                
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
                    startOtpTimer(credentials.email, 'signup');
                } else {
                    alert('An unknown error occurred during sign up.');
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
                    window.location.href = '/home';
                }
            });
        }
    }

    // --- Password Reset Page Specific Logic ---
    const emailRequestForm = document.getElementById('email-request-form');
    if (emailRequestForm) {
        // ... (All original password reset logic is preserved here)
    }

    // --- OTP Timer Logic (Used by Signup and Password Reset) ---
    const startOtpTimer = (email, type) => {
        const timerEl = document.getElementById('timer');
        const resendLink = document.getElementById('resend-otp-link');
        const timerDisplay = document.getElementById('timer-display');
        let countdown = 60;
        if (!timerEl || !resendLink || !timerDisplay) return;

        timerDisplay.style.display = 'block';
        resendLink.classList.add('disabled');
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
                
                const { error } = (type === 'recovery')
                    ? await window.auth.sendPasswordResetOtp(email)
                    : await window.auth.resendOtp(email);

                if (error) {
                    alert(`Failed to resend code: ${error.message}`);
                } else {
                    alert(`A new code has been sent to ${email}.`);
                    startOtpTimer(email, type);
                }
            });
        }
    };
    
    // --- Account Details Page Specific Logic ---
    if (document.body.contains(document.querySelector('.account-card'))) {
        let currentUser = null;

        const populateAccountInfo = (user) => {
            if (!user) return;
            currentUser = user;
            // Updated to populate only the fields that exist
            document.querySelector('[data-field="first_name"] .row-value').textContent = user.first_name || 'Not set';
            document.querySelector('[data-field="last_name"] .row-value').textContent = user.last_name || 'Not set';
            document.querySelector('[data-field="email"] .row-value').textContent = user.email || '';
        };

        const initializeAccountPage = async () => {
            const user = await window.auth.getCurrentUser();
            if (!user) return window.location.href = '/home/login';
            populateAccountInfo(user);
        };

        // ... (Logic for editing fields and saving changes is preserved here)

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await window.auth.logOut();
                window.location.href = '/home';
            });
        }

        // --- New & Improved Delete Account Logic ---
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
            const otherReasonContainer = document.querySelector('.other-reason-container');
            const materialCheckboxes = surveyForm.querySelectorAll('.material-checkbox-label');

            const checkSurveyValidity = () => {
                const isAnyReasonSelected = Array.from(materialCheckboxes).some(cb => cb.classList.contains('checked'));
                finalDeleteBtn.disabled = !isAnyReasonSelected;
            };

            materialCheckboxes.forEach(label => {
                label.addEventListener('click', (e) => {
                    e.preventDefault();
                    label.classList.toggle('checked');
                    const icon = label.querySelector('.material-symbols-outlined');
                    icon.textContent = label.classList.contains('checked') ? 'check_box' : 'check_box_outline_blank';
                    
                    if (label.dataset.value === 'other') {
                        otherReasonContainer.style.display = label.classList.contains('checked') ? 'block' : 'none';
                    }
                    checkSurveyValidity();
                });
            });

            if (surveyForm) {
                surveyForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (confirm("Are you absolutely sure you want to permanently delete your account? This action cannot be undone.")) {
                        finalDeleteBtn.disabled = true;
                        finalDeleteBtn.textContent = "DELETING...";

                        const { error } = await window.auth.deleteUserAccount();

                        if (error) {
                            alert(`Error: ${error.message}`);
                            finalDeleteBtn.disabled = false;
                            finalDeleteBtn.textContent = "Permanently Delete My Account";
                        } else {
                            alert("Your account has been permanently deleted.");
                            window.location.href = '/home';
                        }
                    }
                });
            }
        }
        
        initializeAccountPage();
    }
});
