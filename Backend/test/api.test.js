const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = "test-only-secret-that-is-not-used-outside-tests";

const userA = "64b000000000000000000001";
const userB = "64b000000000000000000002";
const userC = "64b000000000000000000003";
let customers = [];
let users = [];
let workspaces = [];
let memberships = [];
let nextCustomerId = 1;
let nextWorkspaceId = 1;
const nextId = (value) => value.toString(16).padStart(24, "0");

const matches = (doc, query) => {
  for (const [key, value] of Object.entries(query)) {
    if (key === "$and") {
      if (!value.every((condition) => matches(doc, condition))) return false;
      continue;
    }
    if (key === "$or") {
      if (!value.some((condition) => matches(doc, condition))) return false;
    } else if (value && typeof value === "object" && !(value instanceof RegExp) && ("$exists" in value || "$gte" in value || "$in" in value)) {
      if ("$exists" in value && (doc[key] !== undefined) !== value.$exists) return false;
      if ("$gte" in value && new Date(doc[key]) < value.$gte) return false;
      if ("$lt" in value && new Date(doc[key]) >= value.$lt) return false;
      if ("$in" in value && !value.$in.some((candidate) => candidate == null ? doc[key] == null : String(candidate) === String(doc[key]))) return false;
    } else if (value instanceof RegExp) {
      if (!value.test(doc[key])) return false;
    } else if (String(doc[key]) !== String(value)) {
      return false;
    }
  }
  return true;
};

const Customer = {
  async create(data) {
    const doc = { _id: (nextCustomerId++).toString(16).padStart(24, "0"), ...data, createdAt: new Date() };
    doc.toJSON = () => {
      const publicCustomer = { ...doc };
      delete publicCustomer.userId;
      delete publicCustomer.workspaceId;
      delete publicCustomer.toJSON;
      return publicCustomer;
    };
    customers.push(doc);
    return doc;
  },
  find(query) {
    let rows = customers.filter((doc) => matches(doc, query));
    let offset = 0;
    let limit = rows.length;
    const cursor = {
      sort(order) {
        const [field, direction] = Object.entries(order)[0];
        rows = [...rows].sort((left, right) => direction * (left[field] > right[field] ? 1 : left[field] < right[field] ? -1 : 0));
        return cursor;
      },
      select() { return cursor; },
      skip(value) { offset = value; return cursor; },
      limit(value) { limit = value; return Promise.resolve(rows.slice(offset, offset + limit)); },
      then(resolve, reject) { return Promise.resolve(rows.slice(offset, offset + limit)).then(resolve, reject); },
    };
    return cursor;
  },
  async findOne(query) {
    return customers.find((doc) => matches(doc, query)) || null;
  },
  async findOneAndUpdate(query, update) {
    const doc = customers.find((item) => matches(item, query));
    if (doc) Object.assign(doc, update.$set);
    return doc || null;
  },
  async findOneAndDelete(query) {
    const index = customers.findIndex((doc) => matches(doc, query));
    return index < 0 ? null : customers.splice(index, 1)[0];
  },
  async countDocuments(query) {
    return customers.filter((doc) => matches(doc, query)).length;
  },
  async updateMany(query, update) {
    const rows = customers.filter((doc) => matches(doc, query));
    for (const row of rows) Object.assign(row, update.$set);
    return { modifiedCount: rows.length };
  },
  async aggregate(pipeline) {
    const match = pipeline[0].$match;
    const scopeId = String(match.workspaceId ?? match.userId);
    const createdAtRange = pipeline[0].$match.createdAt;
    const scoped = customers.filter((doc) => String(doc.workspaceId ?? doc.userId) === scopeId);
    const owned = scoped.filter((doc) => !createdAtRange || (new Date(doc.createdAt) >= createdAtRange.$gte && new Date(doc.createdAt) < createdAtRange.$lt));
    const facets = pipeline.find((stage) => stage.$facet)?.$facet;
    if (!facets.summary) {
      const monthly = new Map();
      const statuses = new Map();
      const stages = new Map();
      for (const doc of owned) {
        const date = new Date(doc.createdAt);
        const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        monthly.set(month, (monthly.get(month) || 0) + 1);
        statuses.set(doc.status, (statuses.get(doc.status) || 0) + 1);
        const stage = doc.leadStage || "New Lead";
        stages.set(stage, (stages.get(stage) || 0) + 1);
      }
      return [{ monthly: [...monthly].map(([_id, count]) => ({ _id, count })), statuses: [...statuses].map(([_id, count]) => ({ _id, count })), stages: [...stages].map(([_id, count]) => ({ _id, count })) }];
    }
    const recent = [...owned].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map(({ userId, toJSON, ...customer }) => customer);
    const summary = owned.length ? [{
      total: owned.length,
      active: owned.filter((doc) => doc.status === "Active").length,
      pending: owned.filter((doc) => doc.status === "Pending").length,
      inactive: owned.filter((doc) => doc.status === "Inactive").length,
    }] : [];
    const stages = new Map();
    for (const doc of owned) {
      const stage = doc.leadStage || "New Lead";
      stages.set(stage, (stages.get(stage) || 0) + 1);
    }
    const monthThreshold = facets.monthly[0].$match.createdAt.$gte;
    const monthlyMap = new Map();
    for (const doc of owned) {
      if (doc.createdAt >= monthThreshold) {
        const date = new Date(doc.createdAt);
        const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
      }
    }
    return [{ summary, recent, stages: [...stages].map(([_id, count]) => ({ _id, count })), monthly: [...monthlyMap].map(([_id, count]) => ({ _id, count })) }];
  },
};

const Workspace = {
  async findOne(query) {
    return workspaces.find((workspace) => String(workspace.personalFor) === String(query.personalFor)) || null;
  },
  async create(data) {
    const workspace = { _id: nextId(1000 + nextWorkspaceId++), ...data, createdAt: new Date() };
    workspaces.push(workspace);
    return workspace;
  },
  async find(query) {
    const ids = query._id?.$in || [];
    return workspaces.filter((workspace) => ids.some((id) => String(id) === String(workspace._id)));
  },
  async findById(id) {
    return workspaces.find((workspace) => String(workspace._id) === String(id)) || null;
  },
  async deleteOne(query) {
    workspaces = workspaces.filter((workspace) => !(String(workspace._id) === String(query._id) && String(workspace.createdBy) === String(query.createdBy)));
  },
};

const WorkspaceMembership = {
  async updateOne(query, update) {
    let membership = memberships.find((item) => String(item.workspaceId) === String(query.workspaceId) && String(item.userId) === String(query.userId));
    if (!membership && update.$setOnInsert) {
      membership = { _id: nextId(2000 + memberships.length), ...query, ...update.$setOnInsert };
      memberships.push(membership);
    }
    return { upsertedCount: membership ? 1 : 0 };
  },
  async findOne(query) {
    return memberships.find((item) => String(item.workspaceId) === String(query.workspaceId) && String(item.userId) === String(query.userId)) || null;
  },
  async find(query) {
    return memberships.filter((item) => String(item.userId) === String(query.userId));
  },
  async create(data) {
    if (memberships.some((item) => String(item.workspaceId) === String(data.workspaceId) && String(item.userId) === String(data.userId))) {
      const error = new Error("Duplicate membership");
      error.code = 11000;
      throw error;
    }
    const membership = { _id: nextId(2000 + memberships.length), ...data };
    memberships.push(membership);
    return membership;
  },
};

const User = {
  async findOne(query) {
    if (query.$or) {
      return users.find((user) => query.$or.some((condition) => Object.entries(condition).every(([key, value]) => user[key] === value))) || null;
    }
    return users.find((user) => user.email === query.email) || null;
  },
  async create(data) {
    const user = { _id: (users.length + 1).toString(16).padStart(24, "0"), ...data };
    users.push(user);
    return user;
  },
};

const customerModelPath = require.resolve("../Models/Customer.js");
const userModelPath = require.resolve("../Models/User.js");
const workspaceModelPath = require.resolve("../Models/Workspace.js");
const membershipModelPath = require.resolve("../Models/WorkspaceMembership.js");
require.cache[customerModelPath] = { id: customerModelPath, filename: customerModelPath, loaded: true, exports: Customer };
require.cache[userModelPath] = { id: userModelPath, filename: userModelPath, loaded: true, exports: User };
require.cache[workspaceModelPath] = { id: workspaceModelPath, filename: workspaceModelPath, loaded: true, exports: Workspace };
require.cache[membershipModelPath] = { id: membershipModelPath, filename: membershipModelPath, loaded: true, exports: WorkspaceMembership };

const app = express();
app.use(express.json());
app.use("/api/auth", require("../Routes/authRoutes.js"));
app.use("/api/customers", require("../Routes/customerRoutes.js"));
app.use("/api/dashboard", require("../Routes/dashboardRoutes.js"));
app.use("/api/workspaces", require("../Routes/workspaceRoutes.js"));

const tokenFor = (id, email = "test@example.com") =>
  jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: "5m" });
const headersFor = (id) => ({ Authorization: `Bearer ${tokenFor(id)}`, "Content-Type": "application/json" });
const headersForWorkspace = (id, workspaceId) => ({ ...headersFor(id), "X-Workspace-Id": workspaceId });
let server;
let baseUrl;

before(async () => {
  customers = [];
  users = [];
  workspaces = [];
  memberships = [];
  nextCustomerId = 1;
  nextWorkspaceId = 1;
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const createCustomer = async (ownerId, overrides = {}) => {
  const response = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: headersFor(ownerId),
    body: JSON.stringify({
      name: "Sample Customer",
      phone: "555-0100",
      email: "sample@example.com",
      address: "1 Example Street",
      status: "Active",
      ...overrides,
    }),
  });
  return { response, body: await response.json() };
};

test("customer endpoints require a valid Bearer token", async () => {
  const response = await fetch(`${baseUrl}/customers`);
  assert.equal(response.status, 401);
  const stats = await fetch(`${baseUrl}/dashboard/stats`);
  assert.equal(stats.status, 401);
});

test("create, list, search, update, and delete are restricted to the token owner", async () => {
  const { response: createdA, body: bodyA } = await createCustomer(userA, { userId: userB, name: "Alpha.*", email: "alpha@example.com" });
  const { response: createdB, body: bodyB } = await createCustomer(userB);
  assert.equal(createdA.status, 201);
  assert.equal(customers.find((item) => item._id === bodyA.customer._id).userId, userA);
  assert.equal("userId" in bodyA.customer, false);
  assert.equal(createdB.status, 201);

  const listA = await fetch(`${baseUrl}/customers`, { headers: headersFor(userA) }).then((res) => res.json());
  const listB = await fetch(`${baseUrl}/customers`, { headers: headersFor(userB) }).then((res) => res.json());
  assert.deepEqual(listA.customers.map((item) => item._id), [bodyA.customer._id]);
  assert.deepEqual(listB.customers.map((item) => item._id), [bodyB.customer._id]);

  const literalSearch = await fetch(`${baseUrl}/customers?search=.*`, { headers: headersFor(userA) }).then((res) => res.json());
  assert.equal(literalSearch.customers.length, 1);
  assert.equal(literalSearch.customers[0].name, "Alpha.*");
  const ownerSearch = await fetch(`${baseUrl}/customers?search=Sample`, { headers: headersFor(userA) }).then((res) => res.json());
  assert.equal(ownerSearch.customers.length, 0);
  const ownerFilter = await fetch(`${baseUrl}/customers?status=Active`, { headers: headersFor(userA) }).then((res) => res.json());
  assert.equal(ownerFilter.customers.length, 1);

  const idA = bodyA.customer._id;
  const ownDetail = await fetch(`${baseUrl}/customers/${idA}`, { headers: headersFor(userA) });
  assert.equal(ownDetail.status, 200);
  for (const [method, body] of [["GET"], ["PUT", { name: "Changed", phone: "555-0100", email: "changed@example.com", address: "1 Example Street", status: "Active" }], ["DELETE"]]) {
    const response = await fetch(`${baseUrl}/customers/${idA}`, {
      method,
      headers: headersFor(userB),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    assert.equal(response.status, 404);
  }

  const updated = await fetch(`${baseUrl}/customers/${idA}`, {
    method: "PUT",
    headers: headersFor(userA),
    body: JSON.stringify({ name: "Updated", phone: "+919876543210", email: "sample@example.com", address: "1 Example Street", status: "Pending", leadStage: "Contacted", companyName: "Northwind", userId: userB }),
  });
  assert.equal(updated.status, 200);
  assert.equal(customers.find((item) => item._id === idA).userId, userA);
  assert.equal(customers.find((item) => item._id === idA).leadStage, "Contacted");
  assert.equal(customers.find((item) => item._id === idA).companyName, "Northwind");
  const updatedStats = await fetch(`${baseUrl}/dashboard/stats`, { headers: headersFor(userA) }).then((res) => res.json());
  assert.deepEqual([updatedStats.total, updatedStats.active, updatedStats.pending, updatedStats.inactive], [1, 0, 1, 0]);

  const deleted = await fetch(`${baseUrl}/customers/${idA}`, { method: "DELETE", headers: headersFor(userA) });
  assert.equal(deleted.status, 200);
});

test("dashboard counts are scoped and invalid input is rejected", async () => {
  customers = [{
    _id: "64b000000000000000000099",
    name: "Legacy ownerless row",
    phone: "555-0199",
    email: "legacy@example.com",
    address: "Unknown ownership",
    status: "Active",
    createdAt: new Date(),
  }, {
    _id: "64b000000000000000000098",
    userId: userA,
    name: "Owned legacy row",
    phone: "555-0198",
    email: "owned-legacy@example.com",
    address: "2 Example Street",
    status: "Active",
    createdAt: new Date(),
  }];
  await createCustomer(userA, { status: "Active" });
  await createCustomer(userA, { status: "Pending" });
  await createCustomer(userA, { status: "Inactive", leadStage: "Qualified", companyName: "Acme" });
  await createCustomer(userB, { status: "Active" });

  const stats = await fetch(`${baseUrl}/dashboard/stats`, { headers: headersFor(userA) }).then((res) => res.json());
  assert.deepEqual([stats.total, stats.active, stats.pending, stats.inactive], [4, 2, 1, 1]);
  assert.deepEqual(stats.statusDistribution, [{ name: "Active", value: 2 }, { name: "Pending", value: 1 }, { name: "Inactive", value: 1 }]);
  assert.deepEqual(stats.leadStageDistribution.find((stage) => stage.name === "Qualified"), { name: "Qualified", value: 1 });
  assert.equal(stats.leadStageDistribution.find((stage) => stage.name === "New Lead").value, 3);
  assert.equal(stats.monthlyGrowth.length, 6);
  assert.equal(stats.recentCustomers.length, 4);

  const statsB = await fetch(`${baseUrl}/dashboard/stats`, { headers: headersFor(userB) }).then((res) => res.json());
  assert.deepEqual([statsB.total, statsB.active, statsB.pending, statsB.inactive], [1, 1, 0, 0]);
  assert.equal(statsB.recentCustomers.some((customer) => customer.companyName === "Acme"), false);

  const filtered = await fetch(`${baseUrl}/customers?search=Acme&leadStage=Qualified&page=1&limit=1`, { headers: headersFor(userA) }).then((res) => res.json());
  assert.equal(filtered.customers.length, 1);
  assert.equal(filtered.pagination.total, 1);
  assert.equal(filtered.customers[0].companyName, "Acme");

  const legacyStageFilter = await fetch(`${baseUrl}/customers?leadStage=New%20Lead`, { headers: headersFor(userA) }).then((res) => res.json());
  assert.equal(legacyStageFilter.customers.some((customer) => customer.email === "owned-legacy@example.com"), true);

  const invalidId = await fetch(`${baseUrl}/customers/not-an-id`, { headers: headersFor(userA) });
  assert.equal(invalidId.status, 400);
  const invalidBody = await fetch(`${baseUrl}/customers`, { method: "POST", headers: headersFor(userA), body: JSON.stringify({ name: "Bad" }) });
  assert.equal(invalidBody.status, 400);
  const invalidStatus = await fetch(`${baseUrl}/customers?status=other`, { headers: headersFor(userA) });
  assert.equal(invalidStatus.status, 400);
});

test("dashboard chart data stays zero-filled for an empty authenticated account", async () => {
  customers = [];
  const response = await fetch(`${baseUrl}/dashboard/stats`, { headers: headersFor(userA) });
  const stats = await response.json();
  assert.deepEqual([stats.total, stats.active, stats.pending, stats.inactive], [0, 0, 0, 0]);
  assert.equal(stats.monthlyGrowth.length, 6);
  assert.equal(stats.monthlyGrowth.every((month) => month.count === 0), true);
  assert.equal(stats.statusDistribution.every((item) => item.value === 0), true);
  assert.equal(stats.leadStageDistribution.every((item) => item.value === 0), true);
  assert.deepEqual(stats.recentCustomers, []);
});

test("analytics date range returns zero-filled months and only the authenticated user's records", async () => {
  customers = [
    { _id: "64b000000000000000000011", userId: userA, status: "Active", leadStage: "Qualified", createdAt: new Date("2025-01-20T12:00:00.000Z") },
    { _id: "64b000000000000000000012", userId: userA, status: "Pending", createdAt: new Date("2025-03-01T00:00:00.000Z") },
    { _id: "64b000000000000000000013", userId: userA, status: "Inactive", createdAt: new Date("2024-12-31T23:59:59.999Z") },
    { _id: "64b000000000000000000014", userId: userB, status: "Active", leadStage: "Won", createdAt: new Date("2025-02-10T12:00:00.000Z") },
  ];

  const response = await fetch(`${baseUrl}/dashboard/analytics?from=2025-01-01&to=2025-03-31`, { headers: headersFor(userA) });
  const analytics = await response.json();
  assert.equal(response.status, 200);
  assert.equal(analytics.total, 2);
  assert.deepEqual(analytics.monthlyGrowth.map(({ key, count }) => [key, count]), [["2025-01", 1], ["2025-02", 0], ["2025-03", 1]]);
  assert.deepEqual(analytics.statusDistribution, [{ name: "Active", value: 1 }, { name: "Pending", value: 1 }, { name: "Inactive", value: 0 }]);
  assert.deepEqual(analytics.leadStageDistribution.find(({ name }) => name === "Qualified"), { name: "Qualified", value: 1 });
  assert.deepEqual(analytics.leadStageDistribution.find(({ name }) => name === "New Lead"), { name: "New Lead", value: 1 });

  const invalid = await fetch(`${baseUrl}/dashboard/analytics?from=2025-02-30&to=2025-03-31`, { headers: headersFor(userA) });
  assert.equal(invalid.status, 400);
  const reversed = await fetch(`${baseUrl}/dashboard/analytics?from=2025-04-01&to=2025-03-31`, { headers: headersFor(userA) });
  assert.equal(reversed.status, 400);
});

test("workspace listing provisions a personal default and only maps records with that user's legacy owner ID", async () => {
  customers = [
    { _id: "64b000000000000000000021", userId: userC, name: "User C legacy", status: "Active", createdAt: new Date() },
    { _id: "64b000000000000000000022", userId: userB, name: "User B legacy", status: "Active", createdAt: new Date() },
    { _id: "64b000000000000000000023", name: "Ownerless legacy", status: "Active", createdAt: new Date() },
  ];

  const response = await fetch(`${baseUrl}/workspaces`, { headers: headersFor(userC) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.workspaces.length, 1);
  assert.equal(body.workspaces[0].name, "My Workspace");
  assert.equal(body.workspaces[0].role, "owner");
  assert.equal(body.workspaces[0].isDefault, true);
  assert.equal(String(customers[0].workspaceId), body.workspaces[0].id);
  assert.equal(customers[1].workspaceId, undefined);
  assert.equal(customers[2].workspaceId, undefined);

  const ownRecords = await fetch(`${baseUrl}/customers`, { headers: headersForWorkspace(userC, body.workspaces[0].id) }).then((res) => res.json());
  assert.deepEqual(ownRecords.customers.map((customer) => customer.name), ["User C legacy"]);
});

test("workspace creation and activation require membership and isolate CRUD, export, dashboard, and analytics", async () => {
  customers = [];
  const [defaultA, defaultB] = await Promise.all([userA, userB].map(async (userId) => {
    const response = await fetch(`${baseUrl}/workspaces`, { headers: headersFor(userId) });
    return (await response.json()).workspaces[0];
  }));
  const { body: customerA } = await createCustomer(userA, { name: "Private A", email: "private-a@example.com", workspaceId: defaultB.id });
  const { body: customerB } = await createCustomer(userB, { name: "Private B", email: "private-b@example.com" });

  const createdWorkspaceResponse = await fetch(`${baseUrl}/workspaces`, {
    method: "POST",
    headers: headersFor(userA),
    body: JSON.stringify({ name: "Second account" }),
  });
  const createdWorkspaceBody = await createdWorkspaceResponse.json();
  assert.equal(createdWorkspaceResponse.status, 201);
  const secondWorkspace = createdWorkspaceBody.workspace;
  assert.equal(secondWorkspace.role, "owner");
  assert.equal(secondWorkspace.isDefault, false);

  const activateOwn = await fetch(`${baseUrl}/workspaces/${secondWorkspace.id}/activate`, { method: "POST", headers: headersFor(userA) });
  assert.equal(activateOwn.status, 200);
  const activateForeign = await fetch(`${baseUrl}/workspaces/${secondWorkspace.id}/activate`, { method: "POST", headers: headersFor(userB) });
  assert.equal(activateForeign.status, 403);

  const deniedList = await fetch(`${baseUrl}/customers`, { headers: headersForWorkspace(userB, secondWorkspace.id) });
  assert.equal(deniedList.status, 403);
  const deniedExport = await fetch(`${baseUrl}/customers/export`, {
    method: "POST",
    headers: headersForWorkspace(userB, secondWorkspace.id),
    body: JSON.stringify({ scope: "all", columns: ["name"] }),
  });
  assert.equal(deniedExport.status, 403);
  const deniedStats = await fetch(`${baseUrl}/dashboard/stats`, { headers: headersForWorkspace(userB, secondWorkspace.id) });
  assert.equal(deniedStats.status, 403);
  const deniedAnalytics = await fetch(`${baseUrl}/dashboard/analytics`, { headers: headersForWorkspace(userB, secondWorkspace.id) });
  assert.equal(deniedAnalytics.status, 403);

  const foreignCustomerDetail = await fetch(`${baseUrl}/customers/${customerA.customer._id}`, { headers: headersForWorkspace(userB, defaultB.id) });
  assert.equal(foreignCustomerDetail.status, 404);
  const foreignCustomerUpdate = await fetch(`${baseUrl}/customers/${customerA.customer._id}`, {
    method: "PUT",
    headers: headersForWorkspace(userB, defaultB.id),
    body: JSON.stringify({ name: "Attempt", phone: "555-0100", email: "attempt@example.com", address: "1 Example Street", status: "Active" }),
  });
  assert.equal(foreignCustomerUpdate.status, 404);
  const foreignCustomerDelete = await fetch(`${baseUrl}/customers/${customerA.customer._id}`, { method: "DELETE", headers: headersForWorkspace(userB, defaultB.id) });
  assert.equal(foreignCustomerDelete.status, 404);

  const userBList = await fetch(`${baseUrl}/customers`, { headers: headersForWorkspace(userB, defaultB.id) }).then((res) => res.json());
  assert.deepEqual(userBList.customers.map((customer) => customer._id), [customerB.customer._id]);
  const userBStats = await fetch(`${baseUrl}/dashboard/stats`, { headers: headersForWorkspace(userB, defaultB.id) }).then((res) => res.json());
  assert.equal(userBStats.total, 1);
  const userBAnalytics = await fetch(`${baseUrl}/dashboard/analytics`, { headers: headersForWorkspace(userB, defaultB.id) }).then((res) => res.json());
  assert.equal(userBAnalytics.total, 1);
  const userBExport = await fetch(`${baseUrl}/customers/export`, {
    method: "POST",
    headers: headersForWorkspace(userB, defaultB.id),
    body: JSON.stringify({ scope: "all", columns: ["name"] }),
  }).then((res) => res.json());
  assert.deepEqual(userBExport.customers, [{ name: "Private B" }]);

  const secondAccountCustomer = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: headersForWorkspace(userA, secondWorkspace.id),
    body: JSON.stringify({ name: "Second account customer", email: "second@example.com", phone: "+919876543210", address: "2 Example Street", status: "Pending" }),
  });
  assert.equal(secondAccountCustomer.status, 201);
  const secondAccountList = await fetch(`${baseUrl}/customers`, { headers: headersForWorkspace(userA, secondWorkspace.id) }).then((res) => res.json());
  assert.deepEqual(secondAccountList.customers.map((customer) => customer.name), ["Second account customer"]);
  const defaultAccountList = await fetch(`${baseUrl}/customers`, { headers: headersForWorkspace(userA, defaultA.id) }).then((res) => res.json());
  assert.deepEqual(defaultAccountList.customers.map((customer) => customer.name), ["Private A"]);
  assert.equal(customers.find((customer) => customer._id === customerA.customer._id).workspaceId, defaultA.id);
});

test("customer export scopes all, filtered, selected, and count-only requests to the token owner", async () => {
  customers = [];
  const { body: ownedOne } = await createCustomer(userA, { name: "Owned One", email: "one@owned.test", companyName: "Acme" });
  const { body: ownedTwo } = await createCustomer(userA, { name: "Owned Two", email: "two@owned.test", status: "Pending" });
  const { body: foreign } = await createCustomer(userB, { name: "Foreign Customer", email: "foreign@other.test" });
  const request = (body) => fetch(`${baseUrl}/customers/export`, { method: "POST", headers: headersFor(userA), body: JSON.stringify(body) });

  const all = await request({ scope: "all", columns: ["name", "email"] });
  const allBody = await all.json();
  assert.equal(all.status, 200);
  assert.equal(allBody.recordCount, 2);
  assert.deepEqual(allBody.customers.map((customer) => customer.name).sort(), ["Owned One", "Owned Two"]);
  assert.equal("userId" in allBody.customers[0], false);

  const filtered = await request({ scope: "filtered", filters: { search: "Acme", status: "All", leadStage: "All" }, columns: ["name", "companyName"] });
  const filteredBody = await filtered.json();
  assert.equal(filteredBody.recordCount, 1);
  assert.deepEqual(filteredBody.customers, [{ name: "Owned One", companyName: "Acme" }]);

  const selected = await request({ scope: "selected", selectedIds: [ownedOne.customer._id, foreign.customer._id], columns: ["customerId", "email"] });
  const selectedBody = await selected.json();
  assert.equal(selectedBody.recordCount, 1);
  assert.deepEqual(selectedBody.customers, [{ customerId: ownedOne.customer._id, email: "one@owned.test" }]);

  const count = await request({ scope: "selected", selectedIds: [ownedOne.customer._id, foreign.customer._id], columns: [], countOnly: true });
  assert.deepEqual(await count.json(), { success: true, recordCount: 1 });

  const invalid = await request({ scope: "selected", selectedIds: ["not-an-id"], columns: ["name"] });
  assert.equal(invalid.status, 400);
  const invalidColumns = await request({ scope: "all", columns: ["userId"] });
  assert.equal(invalidColumns.status, 400);
  assert.equal(customers.some((customer) => customer._id === ownedTwo.customer._id), true);
});

test("registration and login issue Bearer tokens without returning password material", async () => {
  const registration = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Test", lastName: "User", email: "new@example.com", phone: "5550000999", password: "long-test-password" }),
  });
  const registered = await registration.json();
  assert.equal(registration.status, 201);
  assert.equal(users[0].role, "user");
  assert.equal("password" in registered.user, false);
  assert.equal("password" in registered, false);
  assert.equal(typeof registered.token, "string");

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "new@example.com", password: "long-test-password" }),
  });
  const loggedIn = await login.json();
  assert.equal(login.status, 200);
  assert.equal(typeof loggedIn.token, "string");
  assert.equal("password" in loggedIn.user, false);
  assert.equal("set-cookie" in Object.fromEntries(login.headers), false);

  const logout = await fetch(`${baseUrl}/auth/logout`, { method: "POST" });
  assert.equal(logout.status, 200);
  assert.equal((await logout.json()).success, true);

  const invalidRegistration = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Bad", lastName: "User", email: "bad@example.com", phone: "5550000001", password: "short" }),
  });
  assert.equal(invalidRegistration.status, 400);
  assert.equal(await bcrypt.compare("long-test-password", users[0].password), true);
});
