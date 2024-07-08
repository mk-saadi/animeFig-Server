const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db");
const figureCollection = client.db("animeFig").collection("figures");

router.post("/", async (req, res) => {
	const figures = req.body;
	const result = await figureCollection.insertOne(figures);
	res.send(result);
});

// router.get("/", async (req, res) => {
// 	const cursor = figureCollection.find(
// 		{},
// 		{ projection: { _id: 1, series: 1, images: 1, name: 1, price: 1, offer: 1, label: 1 } }
// 	);
// 	const result = await cursor.toArray();
// 	res.send(result);
// });

router.get("/", async (req, res) => {
	const cursor = figureCollection.find(
		{},
		{ projection: { _id: 1, series: 1, images: { $slice: 1 }, name: 1, price: 1, offer: 1, label: 1 } }
	);
	const result = await cursor.toArray();

	// Alternative approach (using aggregation pipeline):
	// const result = await figureCollection.aggregate([
	//   { $project: { _id: 1, series: 1, images: { $slice: 1 }, name: 1, price: 1, offer: 1, label: 1 } }
	// ]).toArray();

	res.send(result);
});

router.get("/form_value", async (req, res) => {
	try {
		const cursor = figureCollection.find({}, { projection: { _id: 1, series: 1, category: 1 } });
		const result = await cursor.toArray();
		res.send(result);
	} catch (error) {
		console.error("Error fetching data:", error);
		res.status(500).send("Internal server error");
	}
});

router.get("/:id", async (req, res) => {
	const id = req.params.id;
	const query = { _id: new ObjectId(id) };
	const result = await figureCollection.findOne(query);
	res.send(result);
});

module.exports = router;
