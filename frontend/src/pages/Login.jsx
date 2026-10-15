import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setLoginError("");
  };

  const validate = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoginError("");

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/customers/login", {
        email: form.email,
        password: form.password,
      });

      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
      }
      if (response.data?.customer) {
        localStorage.setItem("customer", JSON.stringify(response.data.customer));
      }

      navigate("/home");
    } catch (error) {
      setLoginError("Invalid Credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-icon">🛍️</span>
          <h1>ShopKart</h1>
        </div>

        <h2>Welcome Back</h2>
        <p className="subtitle">
          Login to continue shopping.
        </p>

        {loginError && (
          <div className="error-box">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
            />

            {errors.email && (
              <span className="field-error">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
            />

            {errors.password && (
              <span className="field-error">
                {errors.password}
              </span>
            )}
          </div>

          <button className="primary-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="switch-text">
          Don't have an account?{" "}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;