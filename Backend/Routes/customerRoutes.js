const express = require("express");
const Customer = require("../Models/Customer.js");
const protect = require("../Middleware/authMiddleware.js");

const router = express.Router();

router.use(protect);

// GET customers
router.get("/", async (req, res) => {
  try {
    const { search = "", status = "All" } = req.query;

    let query = {};

    if (status !== "All") {
      query.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex }
      ];
    }

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      customers
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch customers"
    });
  }
});


// GET single customer
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      customer
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch customer"
    });
  }
});


// ADD customer
router.post("/", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      status
    } = req.body;

    if (!name || !phone || !email || !address) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const customer = await Customer.create({
      name,
      phone,
      email,
      address,
      status: status || "Pending"
    });

    res.status(201).json({
      success: true,
      message: "Customer added successfully",
      customer
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to add customer"
    });
  }
});


// UPDATE customer
router.put("/:id", async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
      customer
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update customer"
    });
  }
});


// DELETE customer
router.delete("/:id", async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(
      req.params.id
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      message: "Customer deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete customer"
    });
  }
});

module.exports = router;