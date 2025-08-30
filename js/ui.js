document.addEventListener('DOMContentLoaded', () => {
    // --- Global Logic ---
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('visibility-toggle')) {
            const targetId = e.target.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (!targetInput) return;
            targetInput.type = (targetInput.type === 'password') ? 'text' : 'password';
            e.target.textContent = (targetInput.type === 'password') ? 'visibility_off' : 'visibility';
        }
    });

    // --- Login/Signup Page ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const signupForm = document.getElementById('signup-form');
        const showSignupLink = document.getElementById('show-signup');
        const showLoginLink = document.getElementById('show-login');
        const otpModal = document.getElementById('otp-modal-overlay');

        showSignupLink.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('active'); loginForm.classList.remove('active'); });
        showLoginLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('active'); signupForm.classList.remove('active'); });
    
        document.getElementById('login-button').addEventListener('click', async () => {
            const { error } = await window.auth.logIn({
                email: document.getElementById('login-email').value,
                password: document.getElementById('login-password').value
            });
            if (error) alert(`Login Failed: ${error.message}`); else window.location.href = '/account.html';
        });

        document.getElementById('signup-button').addEventListener('click', async () => {
            if (document.getElementById('signup-password').value !== document.getElementById('signup-confirm-password').value) return alert("Passwords do not match.");
            const credentials = {
                first_name: document.getElementById('signup-firstname').value,
                last_name: document.getElementById('signup-lastname').value,
                email: document.getElementById('signup-email').value,
                password: document.getElementById('signup-password').value
            };
            const { data, error } = await window.auth.signUp(credentials);
            if (error) {
                alert(`Sign Up Failed: ${error.message}`);
            } else if (data.user) {
                document.getElementById('otp-email-display').textContent = credentials.email;
                otpModal.classList.add('active');
                startOtpTimer(credentials.email, 'signup');
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
                    row.classList.toggle('editing');
                    document.getElementById('save-changes-button').style.display = 'block';
                });
            });

            document.getElementById('save-changes-button').addEventListener('click', async () => {
                const editingRow = document.querySelector('.account-row.editing');
                if (!editingRow) return;
                const field = editingRow.dataset.field;
                const newValue = editingRow.querySelector('.row-input').value;
                const { error } = (field === 'password')
                    ? await window.auth.updateUserPassword(newValue)
                    : await window.auth.updateUserProfile({ [field]: newValue });
                if (error) alert(`Update failed: ${error.message}`); else window.location.reload();
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
                label.addEventListener('click', () => {
                    label.classList.toggle('checked');
                    finalDeleteBtn.disabled = !document.querySelector('.material-checkbox-label.checked');
                });
            });
            
            document.getElementById('delete-survey-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                if (confirm("Are you sure? This action is permanent and cannot be undone.")) {
                    const { error } = await window.auth.deleteUserAccount();
                    if (error) alert(`Deletion failed: ${error.message}`); else window.location.href = '/login-signup.html';
                }
            });
        })();
    }

    // --- OTP Timer Function ---
    const startOtpTimer = (email, type) => {
        const timerEl = document.getElementById('timer');
        const resendLink = document.getElementById('resend-otp-link');
        let countdown = 60;
        const interval = setInterval(() => {
            countdown--;
            timerEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                document.getElementById('timer-display').style.display = 'none';
                resendLink.classList.remove('disabled');
            }
        }, 1000);

        resendLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if(resendLink.classList.contains('disabled')) return;
            const { error } = (type === 'signup') ? await window.auth.resendOtp(email) : await window.auth.sendPasswordResetOtp(email);
            if (error) alert(`Failed to resend code: ${error.message}`);
            else alert(`A new code has been sent to ${email}.`);
        });
    };
});
