const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

// mongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `${process.env.Mongo_URI}`;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		const figureCollection = client.db("animeFig").collection("figures");
		const addedFigureCollection = client.db("animeFig").collection("addedFigure");
		const usersCollection = client.db("animeFig").collection("users");

		app.post("/jwt", (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "7d",
			});

			res.send({ token });
		});

		const verifyAdmin = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			if (user?.role !== "admin") {
				return res.status(403).send({ error: true, message: "forbidden access!" });
			}
			next();
		};

		// >> users api
		app.get("/users", async (req, res) => {
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

		app.get("/users/:role/:email", verifyJWT, async (req, res) => {
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

		app.patch("/users/:email", verifyJWT, verifyAdmin, async (req, res) => {
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

		app.post("/users", async (req, res) => {
			const user = req.body;
			const query = { email: user.email };
			const existingUser = await usersCollection.findOne(query);

			if (existingUser) {
				return res.send({ message: "user already exists" });
			}

			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

		app.delete("/users/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await usersCollection.deleteOne(query);
			res.send(result);
		});

		// >> figures api
		app.get("/figures", async (req, res) => {
			const cursor = figureCollection.find();
			const result = await cursor.toArray();
			res.send(result);
		});

		app.get("/figures/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await figureCollection.findOne(query);
			res.send(result);
		});

		app.post("/figures", async (req, res) => {
			const figures = req.body;
			const result = await figureCollection.insertOne(figures);
			res.send(result);
		});

		// >> addedFigure api below
		app.get("/addedFigure/pagination", async (req, res) => {
			const page = parseInt(req.query.page) || 0;
			const limit = parseInt(req.query.limit) || 6;
			const skip = page * limit;
			const result = await addedFigureCollection
				.find(
					{},
					{
						projection: {
							_id: 1,
							img: 1,
							name: 1,
							price: 1,
							category: 1,
							rating: 1,
						},
					}
				)
				.skip(skip)
				.limit(limit)
				.toArray();
			res.send(result);
		});

		app.get("/addedFigure/category", async (req, res) => {
			const category = req.query.category; // Get the category from the query parameter

			if (!category) {
				return res.status(400).send({ error: "Category query parameter is required" });
			}

			const cursor = addedFigureCollection.find({ category: category });
			const result = await cursor.toArray();
			res.send(result);
		});

		app.get("/totalAddedFigure", async (req, res) => {
			const result = await addedFigureCollection.estimatedDocumentCount();
			res.send({ totalAddedFigure: result });
		});

		app.post("/addedFigureById", async (req, res) => {
			const ids = req.body;
			const objectIds = ids.map((id) => new ObjectId(id));
			const query = { _id: { $in: objectIds } };
			const result = await addedFigureCollection.find(query).toArray();
			res.send(result);
		});
		// pagination api above

		app.get("/addedFigure", async (req, res) => {
			let query = {};

			if (req.query?.email) {
				query = { email: req.query.email };
			}
			if (req.query.search) {
				query.name = { $regex: req.query.search, $options: "i" };
			}
			if (req.params.category) {
				if (
					req.params.category == "Scale Figures" ||
					req.params.category == "Bishoujo Figures" ||
					req.params.category == "Figma" ||
					req.params.category == "Nendoroid"
				) {
					query.category = req.params.category;
				} else {
					query.category = { $regex: req.params.category, $options: "i" };
				}
			}
			const result = await addedFigureCollection.find(query).sort({ price: -1 }).toArray();
			res.send(result);
		});
		// const limit = parseInt(req.query.limit) || 20;     .limit(limit)

		app.get("/addedFigure/latest", async (req, res) => {
			const cursor = addedFigureCollection.find().sort({ _id: -1 }).limit(5);
			const result = await cursor.toArray();
			res.send(result);
		});

		// app.get("/addedFigure/:id", async (req, res) => {
		// 	const id = req.params.id;
		// 	const query = { _id: new ObjectId(id) };
		// 	const result = await addedFigureCollection.findOne(query);
		// 	res.send(result);
		// });

		app.post("/addedFigure", async (req, res) => {
			const figure = req.body;
			const result = await addedFigureCollection.insertOne(figure);
			res.send(result);
		});

		app.put("/addedFigure/:id", async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const options = { upsert: true };

			const updatedFigs = req.body;
			const figures = {
				$set: {
					img: updatedFigs.img,
					email: updatedFigs.email,
					name: updatedFigs.name,
					price: updatedFigs.price,
					quantity: updatedFigs.quantity,
					seller: updatedFigs.seller,
					description: updatedFigs.description,
					Manufacturer: updatedFigs.Manufacturer,
					category: updatedFigs.category,
					rating: updatedFigs.rating,
				},
			};
			const result = await addedFigureCollection.updateOne(filter, figures, options);
			res.send(result);
		});

		app.delete("/addedFigure/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await addedFigureCollection.deleteOne(query);
			res.send(result);
		});

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
