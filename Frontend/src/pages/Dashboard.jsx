import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
  total: 0,
  active: 0,
  pending: 0,
  inactive: 0,
});

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "Pending",
  });

  // Load Customers
  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers");

      if (res.data.success) {
        setCustomers(res.data.customers);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.log(err);
      setCustomers([]);
    }
  };

  // Load Dashboard Stats
  const loadStats = async () => {
  try {
    const res = await api.get("/dashboard/stats");

    if (res.data.success) {
      setStats({
        total: res.data.total,
        active: res.data.active,
        pending: res.data.pending,
        inactive: res.data.inactive,
      });
    }
  } catch (err) {
    console.log(err);
  }
};

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Add / Update Customer
  const submit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
      } else {
        await api.post("/customers", form);
      }

      setShowModal(false);
      setEditingId(null);

      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        status: "Pending",
      });

      loadCustomers();
      loadStats();
    } catch (err) {
      console.log(err);
    }
  };

  // Edit Customer
  const editCustomer = (c) => {
    setEditingId(c._id);

    setForm({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      status: c.status || "Pending",
    });

    setShowModal(true);
  };

  // Delete Customer
  const deleteCustomer = async (id) => {
    if (!window.confirm("Delete customer?")) return;

    try {
      await api.delete(`/customers/${id}`);
      loadCustomers();
      loadStats();
    } catch (err) {
      console.log(err);
    }
  };

  // Search + Filter
  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);

    const matchFilter =
      filter === "All" || c.status === filter;

    return matchSearch && matchFilter;
  });

  return (
    <div className="dashboard-page">
      {/* Navbar */}

      <header className="navbar">
        <h2>CustomerHub</h2>

        <div className="nav-right">
          <span>{user.email}</span>

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Cards */}

        <div className="cards">
          <div className="card">
            <p>Total Customers</p>
            <h2>{stats.total}</h2>
          </div>

          <div className="card">
            <p>Active</p>
            <h2>{stats.active}</h2>
          </div>

          <div className="card">
            <p>Pending</p>
            <h2>{stats.pending}</h2>
          </div>

          <div className="card">
  <p>Inactive</p>
  <h2>{stats.inactive}</h2>
</div>
        </div>

        {/* Toolbar */}

        <div className="toolbar">
          <input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Inactive</option>
          </select>

          <button
            className="primary-btn"
            onClick={() => {
              setEditingId(null);
              setForm({
                name: "",
                email: "",
                phone: "",
                address: "",
                status: "Pending",
              });
              setShowModal(true);
            }}
          >
            + Add Customer
          </button>
        </div>

        {/* Table */}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length > 0 ? (
                filtered.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>

                    <td>{c.email}</td>

                    <td>{c.phone}</td>

                    <td>
                      <span
                        className={`badge ${(c.status || "Pending").toLowerCase()}`}
                      >
                        {c.status || "Pending"}
                      </span>
                    </td>

                    <td>
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => editCustomer(c)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => deleteCustomer(c._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}

      {showModal && (
        <div className="modal">
          <div className="modal-box">
            <h3>
              {editingId ? "Edit Customer" : "Add Customer"}
            </h3>

            <form onSubmit={submit}>
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                required
              />

              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                required
              />

              <input
                placeholder="Address"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                required
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              >
                <option>Active</option>
                <option>Pending</option>
                <option>Inactive</option>
              </select>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}