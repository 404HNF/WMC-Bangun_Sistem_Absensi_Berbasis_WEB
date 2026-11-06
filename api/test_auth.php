<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Test API Login</title>
</head>
<body>
    <h2>Test API Login</h2>

    <form id="loginForm">
        <input type="text" id="username" value="admin" placeholder="Username">
        <input type="password" id="password" value="admin123" placeholder="Password">
        <button type="submit">Login</button>
    </form>

    <pre id="hasil"></pre>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData();
            formData.append('username', document.getElementById('username').value);
            formData.append('password', document.getElementById('password').value);
            console.log('Username:', formData.get('username'));
            console.log('Password:', formData.get('password'));

            try {
                const response = await fetch('auth.php?aksi=login', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                document.getElementById('hasil').textContent =
                    JSON.stringify(result, null, 2);
            } catch (error) {
                document.getElementById('hasil').textContent = error.message;
            }
        });
    </script>
</body>
</html>