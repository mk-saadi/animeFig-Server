const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db.js");
const jwt = require("jsonwebtoken");
const usersCollection = client.db("animeFig").collection("users");

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res.status(401).send({ error: true, message: "unauthorized access" });
	}
	const token = authorization.split(" ")[1];

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		if (err) {
			return res.status(401).send({ error: true, message: "unauthorized access" });
		}
		req.decoded = decoded;
		next();
	});
};

const verifyGeneralAdmin = async (req, res, next) => {
	const email = req.decoded.email;
	const query = { email: email };
	const user = await usersCollection.findOne(query);
	if (user?.role !== "general_admin") {
		return res.status(403).send({ error: true, message: "forbidden access!" });
	}
	next();
};
const verifySuperiorAdmin = async (req, res, next) => {
	const email = req.decoded.email;
	const query = { email: email };
	const user = await usersCollection.findOne(query);
	if (user?.role !== "superior_admin") {
		return res.status(403).send({ error: true, message: "forbidden access!" });
	}
	next();
};

// Create user
router.post("/", async (req, res) => {
	const user = req.body;
	const query = { email: user.email };
	const existingUser = await usersCollection.findOne(query);

	if (existingUser) {
		return res.send({ message: "user already exists" });
	}

	const result = await usersCollection.insertOne(user);
	res.send(result);
});

// >> get users
router.get("/", async (req, res) => {
	let query = {};

	if (req.query?.email) {
		query.email = {
			$regex: req.query.email,
			$options: "i",
		};
	}
	if (req.query?.name) {
		query.name = { $regex: req.query.name, $options: "i" };
	}
	if (req.query?.role) {
		query.role = { $regex: req.query.role, $options: "i" };
	}

	const result = await usersCollection.find(query).toArray();
	res.send(result);
});

router.get("/:role/:email", verifyJWT, async (req, res) => {
	const role = req.params.role;
	const email = req.params.email;

	if (email !== req.decoded.email) {
		return res.send({ [role]: false });
	}

	const query = { email: email };
	const user = await usersCollection.findOne(query);
	const result = { [role]: user?.role === role };
	res.send(result);
});

// # get users by id
router.get("/:id", async (req, res) => {
	const id = req.params.id;
	const query = { _id: new ObjectId(id) };
	const result = await usersCollection.findOne(query);
	res.send(result);
});

router.patch("/:email", verifyJWT, verifyGeneralAdmin, async (req, res) => {
	const { email } = req.params;
	const { role } = req.body;

	try {
		await usersCollection.updateOne({ email: email }, { $set: { role: role } });

		res.status(200).send({
			message: "User role updated successfully",
		});
	} catch (error) {
		res.status(500).send({
			error: "Internal server error",
		});
	}
});

router.delete("/:id", verifyJWT, async (req, res) => {
	const id = req.params.id;
	const query = { _id: new ObjectId(id) };
	const result = await usersCollection.deleteOne(query);
	res.send(result);
});

module.exports = router;
