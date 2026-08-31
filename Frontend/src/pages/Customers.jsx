import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function Customers() {

  const [customers, setCustomers] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("All");

  const [showForm, setShowForm] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState(null);


  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    status: "Pending"
  });


  const fetchCustomers = async () => {

    try {

      const response = await api.get(
        "/customers",
        {
          params: {
            search,
            status
          }
        }
      );

      setCustomers(response.data.customers);

    } catch (error) {
      console.log(error);
    }
  };


  useEffect(() => {

    const timer = setTimeout(
      fetchCustomers,
      300
    );

    return () => clearTimeout(timer);

  }, [search, status]);


  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };


  const submitCustomer = async (e) => {

    e.preventDefault();

    if (
      !form.name ||
      !form.phone ||
      !form.email ||
      !form.address
    ) {
      alert("Please fill all fields");
      return;
    }

    try {

      if (editingCustomer) {

        await api.put(
          `/customers/${editingCustomer._id}`,
          form
        );

        alert("Customer updated");

      } else {

        await api.post(
          "/customers",
          form
        );

        alert("Customer added");
      }

      setShowForm(false);
      setEditingCustomer(null);

      setForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        status: "Pending"
      });

      fetchCustomers();

    } catch (error) {

      alert(
        error.response?.data?.message ||
        "Something went wrong"
      );
    }
  };


  const editCustomer = (customer) => {

    setEditingCustomer(customer);

    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      status: customer.status
    });

    setShowForm(true);
  };


  const deleteCustomer = async (id) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this customer?"
      );

    if (!confirmDelete) return;

    try {

      await api.delete(
        `/customers/${id}`
      );

      alert("Customer deleted");

      fetchCustomers();

    } catch (error) {

      alert("Delete failed");
    }
  };


  return (

    <div className="customer-page">

      <div className="page-header">

        <div>
          <h1>Customers</h1>
          <p>Manage all customer records</p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowForm(true);
          }}
        >
          + Add Customer
        </button>

      </div>


      <div className="filters">

        <input
          placeholder="Search name, email or phone..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
        >
          <option>All</option>
          <option>Active</option>
          <option>Pending</option>
          <option>Inactive</option>
        </select>

      </div>


      {showForm && (

        <div className="form-card">

          <h2>
            {editingCustomer
              ? "Edit Customer"
              : "Add Customer"}
          </h2>

          <form onSubmit={submitCustomer}>

            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
            />

            <input
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={handleChange}
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
            />

            <textarea
              name="address"
              placeholder="Address"
              value={form.address}
              onChange={handleChange}
            />

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option>Active</option>
              <option>Pending</option>
              <option>Inactive</option>
            </select>

            <button type="submit">
              {editingCustomer
                ? "Update Customer"
                : "Add Customer"}
            </button>

            <button
              type="button"
              onClick={() =>
                setShowForm(false)
              }
            >
              Cancel
            </button>

          </form>

        </div>
      )}


      <div className="table-container">

        <table>

          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Date Added</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {customers.map((customer) => (

              <tr key={customer._id}>

                <td>{customer.name}</td>

                <td>{customer.phone}</td>

                <td>{customer.email}</td>

                <td>
                  <span
                    className={`status ${customer.status.toLowerCase()}`}
                  >
                    {customer.status}
                  </span>
                </td>

                <td>
                  {new Date(
                    customer.createdAt
                  ).toLocaleDateString()}
                </td>

                <td>

                  <Link
                    to={`/customers/${customer._id}`}
                  >
                    View
                  </Link>

                  {" "}

                  <button
                    onClick={() =>
                      editCustomer(customer)
                    }
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      deleteCustomer(customer._id)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Customers;