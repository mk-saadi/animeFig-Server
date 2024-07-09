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

// make a pagination api
router.get("/pagination", async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 6;
	const skip = (page - 1) * limit;

	try {
		const result = await figureCollection
			.find(
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
			)
			.skip(skip)
			.limit(limit)
			.toArray();

		res.send(result);
	} catch (error) {
		res.status(500).send("Error fetching paginated data");
	}
});

router.get("/totalFigure", async (req, res) => {
	const result = await figureCollection.countDocuments();
	res.send({ totalFigure: result });
});

router.get("/:id", async (req, res) => {
	const id = req.params.id;
	const query = { _id: ObjectId(id) };
	const result = await figureCollection.findOne(query);
	res.send(result);
});

router.get("/search", async (req, res) => {
	const { category, series, character, brand } = req.query;
	const query = {};
	console.log("query: ", query);

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

	const cursor = figureCollection.find(query, {
		projection: {
			_id: 1,
			name: 1,
			images: { $slice: 2 },
			price: 1,
			series: 1,
			offer: 1,
			label: 1,
		},
	});
	const result = await cursor.toArray();
	console.log("result: ", result);
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

// router.get("/:id", async (req, res) => {
// 	try {
// 		const id = req.params.id;
// 		const objectId = new ObjectId(id); // Explicit conversion
// 		const query = { _id: objectId };
// 		const result = await figureCollection.findOne(query);
// 		res.send(result);
// 	} catch (error) {
// 		console.error("Error fetching data:", error);
// 		res.status(500).send("Internal server error");
// 	}
// });

module.exports = router;
