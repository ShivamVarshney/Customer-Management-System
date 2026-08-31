import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../api";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

 const submit = async (e) => {
  e.preventDefault();
  setError("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(form.email)) {
    return setError("Please enter a valid email address.");
  }

  try {
    const { data } = await api.post("/auth/login", form);

console.log("Login Response:", data);

localStorage.setItem("token", data.token);
localStorage.setItem("user", JSON.stringify(data.user));

console.log("Saved Token:", localStorage.getItem("token"));

navigate("/");
  } catch (err) {
    setError(err.response?.data?.message || "Login failed");
  }
};

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">C</div>

        <h1>CustomerHub</h1>
        <p>Welcome back</p>

        <form onSubmit={submit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={change}
            required
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={change}
              required
            />

            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="primary-btn">
            Sign In
          </button>
        </form>

        <span>
          Don't have an account? <Link to="/register">Register</Link>
        </span>
      </div>
    </div>
  );
}