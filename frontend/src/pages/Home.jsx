import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import api from "../services/api";

function Home() {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await api.get("/customers/me");

        setCustomer(response.data);
      } catch (error) {

        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [navigate]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loader"></div>
        <p>Loading your account...</p>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="home-page">
      <Navbar />

      <main className="home-content">
        <div className="welcome-section">
          <p className="eyebrow">SHOPKART</p>

          <h1>
            Welcome, {customer.fullName || customer.name}! 👋
          </h1>

          <p>
            Great to see you again. Here are your account details.
          </p>
        </div>

        <div className="customer-card">
          <div className="avatar">
            {(customer.fullName || customer.name)?.charAt(0).toUpperCase()}
          </div>

          <div className="customer-details">
            <h2>Customer Information</h2>

            <div className="detail-row">
              <span>Name</span>
              <strong>{customer.fullName || customer.name}</strong>
            </div>

            <div className="detail-row">
              <span>Email</span>
              <strong>{customer.email}</strong>
            </div>

            <div className="detail-row">
              <span>Phone</span>
              <strong>{customer.phone}</strong>
            </div>
          </div>
                </div>

        <button
          className="products-button"
          onClick={() => navigate("/products")}
        >
          View Products
        </button>
      </main>
    </div>
  );
}

export default Home;