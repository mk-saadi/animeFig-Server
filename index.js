const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// const verifyJWT = (req, res, next) => {
// 	const authorization = req.headers.authorization;
// 	if (!authorization) {
// 		return res.status(401).send({ error: true, message: "unauthorized access" });
// 	}
// 	const token = authorization.split(" ")[1];

// 	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
// 		if (err) {
// 			return res.status(401).send({ error: true, message: "unauthorized access" });
// 		}
// 		req.decoded = decoded;
// 		next();
// 	});
// };

const { connectToDatabase, client } = require("./db");

// Import routes
const addedFigureRoutes = require("./collections/addedFigure");
const userRoutes = require("./collections/users");
const figureRoutes = require("./collections/figures");

async function run() {
	try {
		const { figureCollection, addedFigureCollection, usersCollection } = await connectToDatabase();

		// const figureCollection = client.db("animeFig").collection("figures");
		// const addedFigureCollection = client.db("animeFig").collection("addedFigure");
		// const usersCollection = client.db("animeFig").collection("users");

		app.post("/jwt", (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "7d",
			});

			res.send({ token });
		});

		// Attach the collection to the request object
		app.use((req, res, next) => {
			req.figureCollection = figureCollection;
			req.addedFigureCollection = addedFigureCollection;
			req.usersCollection = usersCollection;
			next();
		});

		// Use routes
		app.use("/figures", figureRoutes);
		app.use("/addedFigure", addedFigureRoutes);
		app.use("/users", userRoutes);
		// app.use("/users", userRoutes);

		// const verifyAdmin = async (req, res, next) => {
		// 	const email = req.decoded.email;
		// 	const query = { email: email };
		// 	const user = await usersCollection.findOne(query);
		// 	if (user?.role !== "admin") {
		// 		return res.status(403).send({ error: true, message: "forbidden access!" });
		// 	}
		// 	next();
		// };

		// // >> users api
		// app.get("/users", async (req, res) => {
		// 	let query = {};

		// 	if (req.query?.email) {
		// 		query.email = {
		// 			$regex: req.query.email,
		// 			$options: "i",
		// 		};
		// 	}

		// 	if (req.query?.name) {
		// 		query.name = { $regex: req.query.name, $options: "i" };
		// 	}

		// 	if (req.query?.role) {
		// 		query.role = { $regex: req.query.role, $options: "i" };
		// 	}

		// 	const result = await usersCollection.find(query).toArray();
		// 	res.send(result);
		// });

		// app.get("/users/:role/:email", verifyJWT, async (req, res) => {
		// 	const role = req.params.role;
		// 	const email = req.params.email;

		// 	if (email !== req.decoded.email) {
		// 		return res.send({ [role]: false });
		// 	}

		// 	const query = { email: email };
		// 	const user = await usersCollection.findOne(query);
		// 	const result = { [role]: user?.role === role };
		// 	res.send(result);
		// });

		// app.patch("/users/:email", verifyJWT, verifyAdmin, async (req, res) => {
		// 	const { email } = req.params;
		// 	const { role } = req.body;

		// 	try {
		// 		await usersCollection.updateOne({ email: email }, { $set: { role: role } });

		// 		res.status(200).send({
		// 			message: "User role updated successfully",
		// 		});
		// 	} catch (error) {
		// 		res.status(500).send({
		// 			error: "Internal server error",
		// 		});
		// 	}
		// });

		// app.post("/users", async (req, res) => {
		// 	const user = req.body;
		// 	const query = { email: user.email };
		// 	const existingUser = await usersCollection.findOne(query);

		// 	if (existingUser) {
		// 		return res.send({ message: "user already exists" });
		// 	}

		// 	const result = await usersCollection.insertOne(user);
		// 	res.send(result);
		// });

		// app.delete("/users/:id", verifyJWT, async (req, res) => {
		// 	const id = req.params.id;
		// 	const query = { _id: new ObjectId(id) };
		// 	const result = await usersCollection.deleteOne(query);
		// 	res.send(result);
		// });

		// // >> figures api
		// app.get("/figures", async (req, res) => {
		// 	const cursor = figureCollection.find();
		// 	const result = await cursor.toArray();
		// 	res.send(result);
		// });

		// app.get("/figures/:id", async (req, res) => {
		// 	const id = req.params.id;
		// 	const query = { _id: new ObjectId(id) };
		// 	const result = await figureCollection.findOne(query);
		// 	res.send(result);
		// });

		// app.post("/figures", async (req, res) => {
		// 	const figures = req.body;
		// 	const result = await figureCollection.insertOne(figures);
		// 	res.send(result);
		// });

		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You successfully connected to MongoDB!");
	} finally {
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("animeFig server is running");
});

app.listen(port, () => {
	console.log(`animeFig server is running at ${port}`);
});
