import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

function CustomerDetails() {

  const { id } = useParams();

  const [customer, setCustomer] =
    useState(null);

  useEffect(() => {

    const fetchCustomer = async () => {

      try {

        const response =
          await api.get(`/customers/${id}`);

        setCustomer(response.data.customer);

      } catch (error) {
        console.log(error);
      }
    };

    fetchCustomer();

  }, [id]);


  if (!customer) {
    return <h2>Loading...</h2>;
  }


  return (

    <div className="details">

      <Link to="/customers">
        ← Back to Customers
      </Link>

      <h1>Customer Details</h1>

      <div className="details-card">

        <h2>{customer.name}</h2>

        <p>
          <strong>Email:</strong>{" "}
          {customer.email}
        </p>

        <p>
          <strong>Phone:</strong>{" "}
          {customer.phone}
        </p>

        <p>
          <strong>Address:</strong>{" "}
          {customer.address}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          {customer.status}
        </p>

        <p>
          <strong>Date Added:</strong>{" "}
          {new Date(
            customer.createdAt
          ).toLocaleDateString()}
        </p>

      </div>

    </div>
  );
}

export default CustomerDetails;