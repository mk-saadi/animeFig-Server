const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db.js");
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

// Alternative approach (using aggregation pipeline):
// const result = await figureCollection.aggregate([
//   { $project: { _id: 1, series: 1, images: { $slice: 1 }, name: 1, price: 1, offer: 1, label: 1 } }
// ]).toArray();
router.get("/", async (req, res) => {
	const cursor = figureCollection.find(
		{},
		{
			projection: {
				_id: 1,
				name: 1,
				images: { $slice: 2 },
				price: 1,
				series: 1,
				offer: 1,
				label: 1,
			},
		}
	);
	const result = await cursor.toArray();

	res.send(result);
});

// pagination api
router.get("/totalFigure", async (req, res) => {
	const result = await figureCollection.countDocuments();
	res.send({ totalFigure: result });
});

router.get("/search", async (req, res) => {
	const { category, series, character, brand } = req.query;
	const { page, limit } = req.query;
	const query = {};

	if (category) query.category = category;
	if (series) query.series = series;
	if (character) query.character = character;
	if (brand) query.brand = brand;

	// Ensure at least one query parameter is provided
	if (Object.keys(query).length === 0) {
		return res
			.status(400)
			.send({ error: "At least one query parameter (category, series, character, brand) is required" });
	}

	const pageInt = parseInt(page) || 1;
	const limitInt = parseInt(limit) || 6;
	const skip = (pageInt - 1) * limitInt;

	try {
		const cursor = figureCollection
			.find(query, {
				projection: {
					_id: 1,
					name: 1,
					images: { $slice: 2 },
					price: 1,
					series: 1,
					offer: 1,
					label: 1,
				},
			})
			.skip(skip)
			.limit(limitInt);

		const result = await cursor.toArray();
		res.send(result);
	} catch (error) {
		console.error("Error fetching search results:", error);
		res.status(500).send("Error fetching search results");
	}
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

// get figures by id
router.get("/:id", async (req, res) => {
	const id = req.params.id;

	// Validate the id format
	if (!ObjectId.isValid(id)) {
		return res.status(400).send("Invalid ObjectId format");
	}

	const query = { _id: new ObjectId(id) };
	const result = await figureCollection.findOne(query);
	console.log("result: ", result);
	res.send(result);
});

module.exports = router;
