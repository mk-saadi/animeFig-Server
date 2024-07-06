const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
const { connectToDatabase, client } = require("./db");

// Import routes
const addedFigureRoutes = require("./collections/addedFigure");
const userRoutes = require("./collections/users");
const figureRoutes = require("./collections/figures");
const categoriesRoutes = require("./collections/categories");

async function run() {
	try {
		const { figureCollection, addedFigureCollection, usersCollection, categoryCollection } =
			await connectToDatabase();

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
			req.categoryCollection = categoryCollection;
			next();
		});

		// Use routes
		app.use("/figures", figureRoutes);
		app.use("/addedFigure", addedFigureRoutes);
		app.use("/users", userRoutes);
		app.use("/categories", categoriesRoutes);

		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You are successfully connected to MongoDB!");
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
