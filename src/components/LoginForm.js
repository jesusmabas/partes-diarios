// src/components/LoginForm.js
import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { app } from '../firebase'; // Importa 'app' desde tu archivo firebase.js

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false); // Controla si el usuario se registra o inicia sesión
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null); // Almacena la información del usuario

    const auth = getAuth(app);

    // Lista blanca de correos electrónicos permitidos (¡Ajusta esto a tus necesidades!)
const allowedEmails = ['info@alqatifa.com', 'jesusmabas@gmail.com']; // ¡Coma agregada!

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null); // Limpia errores anteriores

        try {
            if (isRegistering) {
                // --- VERIFICACIÓN DE LISTA BLANCA (solo para registro) ---
                if (!allowedEmails.includes(email)) {
                    setError('Este correo electrónico no está autorizado para registrarse.');
                    return; // Detiene la ejecución si el correo no es válido
                }

                // --- REGISTRO (si el correo es válido) ---
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
                console.log("Usuario registrado:", userCredential.user);
            } else {
                // --- INICIO DE SESIÓN (sin cambios) ---
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                setUser(userCredential.user);
                console.log("Usuario logueado:", userCredential.user);
            }
        } catch (error) {
            setError(error.message); // Muestra el mensaje de error de Firebase
            console.error("Error:", error);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setUser(null);
            console.log("Usuario deslogueado");
        } catch (error) {
            setError(error.message);
            console.error("Error al desloguear:", error);
        }
    };

    return (
        <div>
            {user ? ( // Muestra información del usuario si está logueado
                <div>
                    <p>Bienvenido, {user.email}</p>
                    <button onClick={handleSignOut}>Cerrar Sesión</button>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <h2>{isRegistering ? 'Registrarse' : 'Iniciar Sesión'}</h2>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <div>
                        <label htmlFor="email">Correo Electrónico:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password">Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">{isRegistering ? 'Registrarse' : 'Iniciar Sesión'}</button>
                    <button type="button" onClick={() => setIsRegistering(!isRegistering)}>
                        {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
                    </button>
                </form>
            )}
        </div>
    );
}

export default LoginForm;