        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const tagline = document.getElementById('tagline');
        const toggleBtns = document.querySelectorAll('.toggle-btn');

        function showForm(type) {
            if (type === 'login') {
                loginForm.classList.add('active');
                loginForm.classList.remove('hidden-left');
                signupForm.classList.remove('active');
                signupForm.classList.add('hidden-left');
                
                toggleBtns[0].classList.add('active');
                toggleBtns[1].classList.remove('active');
                tagline.innerText = "Welcome back";
            } else {
                signupForm.classList.add('active');
                signupForm.classList.remove('hidden-left');
                loginForm.classList.remove('active');
                loginForm.classList.add('hidden-left');

                toggleBtns[1].classList.add('active');
                toggleBtns[0].classList.remove('active');
                tagline.innerText = "Join the quiet space";
            }
        }

        function togglePasswordVisibility(id) {
            const input = document.getElementById(id);
            const btn = input.nextElementSibling;
            if (input.type === "password") {
                input.type = "text";
                btn.innerText = "HIDE";
            } else {
                input.type = "password";
                btn.innerText = "SHOW";
            }
        }

        // Storage helper
        const storage = {
            get: (k) => {
                try {
                    const d = localStorage.getItem(k);
                    return d ? JSON.parse(d) : null;
                } catch {
                    return null;
                }
            },
            set: (k, v) => {
                try {
                    localStorage.setItem(k, JSON.stringify(v));
                } catch {
                    // fail silently
                }
            },
            remove: (k) => {
                try {
                    localStorage.removeItem(k);
                } catch {
                    // fail silently
                }
            },
            clear: () => {
                try {
                    localStorage.clear();
                } catch {
                    // fail silently
                }
            }
        };

        // Pre-register Creator account
        function initializeCreatorAccount() {
            const creatorEmail = 'harki.amrik@gmial.com';
            const creatorUsername = 'Creator-Of-Room';
            const creatorPassword = 'ijokpluh0908';
            
            // Check if creator account already exists
            let existingProfile = storage.get('userProfile');
            let accounts = storage.get('accounts') || {};
            
            // If accounts don't exist or creator account not set up, initialize it
            if (!accounts[creatorEmail]) {
                accounts[creatorEmail] = {
                    name: creatorUsername,
                    email: creatorEmail,
                    password: creatorPassword, // Note: In production, this should be hashed
                    isCreator: true,
                    createdAt: new Date().toISOString()
                };
                storage.set('accounts', accounts);
            }
            
            // Set creator profile if not exists
            if (!existingProfile || existingProfile.email !== creatorEmail) {
                // Don't override if user already has a profile, just ensure creator account exists
            }
        }

        // Initialize on page load
        initializeCreatorAccount();

        // Reset everything function
        window.resetEverything = function() {
            if (confirm('Are you sure you want to reset everything? This will delete all rooms, messages, settings, and profile data.')) {
                storage.clear();
                alert('Everything has been reset.');
                window.location.reload();
            }
        };

        // Form Submission Logic
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            // Check accounts
            const accounts = storage.get('accounts') || {};
            const account = accounts[email];
            
            if (account && account.password === password) {
                // Valid login
                const userProfile = {
                    name: account.name,
                    email: account.email,
                    isCreator: account.isCreator || false
                };
                storage.set('userProfile', userProfile);
                storage.set('currentUser', account.name);
                console.log('Login successful:', { email, name: account.name });
                alert('Login successful');
                window.location.href = "home.html";
            } else {
                // Invalid credentials
                alert('Invalid email or password');
            }
        });

        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;

            if (password !== confirmPassword) {
                alert("Passwords do not match");
                return;
            }

            // Check if account already exists
            let accounts = storage.get('accounts') || {};
            if (accounts[email]) {
                alert('An account with this email already exists. Please login instead.');
                showForm('login');
                return;
            }

            // Create new account
            accounts[email] = {
                name: name || 'You',
                email: email,
                password: password, // Note: In production, this should be hashed
                isCreator: false,
                createdAt: new Date().toISOString()
            };
            storage.set('accounts', accounts);

            // Save user profile to localStorage
            const userProfile = {
                name: name || 'You',
                email: email,
                createdAt: new Date().toISOString()
            };
            storage.set('userProfile', userProfile);
            storage.set('currentUser', name || 'You');

            console.log('Signup successful:', { name, email });
            alert('Account created successfully');
            window.location.href = "homev1.html";
        });

        // Simple Input Micro-interaction
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });
            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('focused');
            });
        });