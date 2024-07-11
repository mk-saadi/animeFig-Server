const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db.js");
const figureCollection = client.db("animeFig").collection("figures");

router.post("/", async (req, res) => {
	const figures = req.body;
	const result = await figureCollection.insertOne(figures);
	res.send(result);
});

router.get("/", async (req, res) => {
	const cursor = figureCollection
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
					link: 1,
					label: 1,
				},
			}
		)
		.sort({ _id: -1 });

	const result = await cursor.toArray();

	res.send(result);
});

router.get("/collections", async (req, res) => {
	const { page, limit, search } = req.query;

	const pageInt = parseInt(page) || 1;
	const limitInt = parseInt(limit) || 12;
	const skip = (pageInt - 1) * limitInt;

	const query = {};
	if (search) {
		const searchRegex = { $regex: search, $options: "i" };
		query.$or = [
			{ name: searchRegex },
			{ character: searchRegex },
			{ series: searchRegex },
			{ category: searchRegex },
		];
	}

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
					link: 1,
					label: 1,
				},
			})
			.sort({ _id: -1 })
			.skip(skip)
			.limit(limitInt);

		const result = await cursor.toArray();
		const totalFigures = await figureCollection.countDocuments(query);

		res.send({
			figures: result,
			totalFigures,
			totalPages: Math.ceil(totalFigures / limitInt),
			currentPage: pageInt,
		});
	} catch (error) {
		console.error("Error fetching figures:", error);
		res.status(500).send("Error fetching figures");
	}
});

// pagination api
// router.get("/search", async (req, res) => {
// 	const { category, series, character, brand } = req.query;
// 	const { page, limit } = req.query;
// 	const query = {};

// 	if (category) query.category = category;
// 	if (series) query.series = series;
// 	if (character) query.character = character;
// 	if (brand) query.brand = brand;

// 	if (Object.keys(query).length === 0) {
// 		return res
// 			.status(400)
// 			.send({ error: "At least one query parameter (category, series, character, brand) is required" });
// 	}

// 	const pageInt = parseInt(page) || 1;
// 	const limitInt = parseInt(limit) || 6;
// 	const skip = (pageInt - 1) * limitInt;

// 	try {
// 		const cursor = figureCollection
// 			.find(query, {
// 				projection: {
// 					_id: 1,
// 					name: 1,
// 					images: { $slice: 2 },
// 					price: 1,
// 					series: 1,
// 					offer: 1,
// 					label: 1,
// 					link: 1,
// 				},
// 			})
// 			.skip(skip)
// 			.limit(limitInt);

// 		const result = await cursor.toArray();
// 		res.send(result);
// 	} catch (error) {
// 		console.error("Error fetching search results:", error);
// 		res.status(500).send("Error fetching search results");
// 	}
// });

// working pagination api: http://localhost:3000/figures/search?series=Fate%20Series&category=Scale%20Figures&page=1&limit=2
router.get("/search_api", async (req, res) => {
	const { category, series, character, brand, page, limit } = req.query;
	const query = {};

	if (category) query.category = category;
	if (series) query.series = series;
	if (character) query.character = character;
	if (brand) query.brand = brand;

	if (Object.keys(query).length === 0) {
		return res
			.status(400)
			.send({ error: "At least one query parameter (category, series, character, brand) is required" });
	}

	const pageInt = parseInt(page) || 1;
	const limitInt = parseInt(limit) || 12;
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
					link: 1,
				},
			})
			.sort({ _id: -1 })
			.skip(skip)
			.limit(limitInt);

		const result = await cursor.toArray();
		const totalMatchingFigures = await figureCollection.countDocuments(query);

		res.send({
			figures: result,
			totalMatchingFigures,
		});
	} catch (error) {
		console.error("Error fetching search results:", error);
		res.status(500).send("Error fetching search results");
	}
});

router.get("/search", async (req, res) => {
	const { params, page, limit } = req.query;
	const query = {};

	if (params) {
		query.$or = [{ category: params }, { series: params }, { character: params }, { brand: params }];
	}

	if (Object.keys(query).length === 0) {
		return res.status(400).send({ error: "At least one query parameter (params) is required" });
	}

	const pageInt = parseInt(page) || 1;
	const limitInt = parseInt(limit) || 12;
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
					link: 1,
				},
			})
			.sort({ _id: -1 })
			.skip(skip)
			.limit(limitInt);

		const result = await cursor.toArray();
		const totalMatchingFigures = await figureCollection.countDocuments(query);

		res.send({
			figures: result,
			totalMatchingFigures,
		});
	} catch (error) {
		console.error("Error fetching search results:", error);
		res.status(500).send("Error fetching search results");
	}
});

router.get("/totalFigure", async (req, res) => {
	const result = await figureCollection.countDocuments();
	res.send({ totalFigure: result });
});

router.get("/form_value", async (req, res) => {
	try {
		const cursor = figureCollection.find(
			{},
			{ projection: { _id: 1, series: 1, category: 1, brand: 1, character: 1, link: 1 } }
		);
		const result = await cursor.toArray();
		res.send(result);
	} catch (error) {
		console.error("Error fetching data:", error);
		res.status(500).send("Internal server error");
	}
});

// get figure by link
router.get("/:link", async (req, res) => {
	const link = req.params.link;
	const query = { link: link };
	const result = await figureCollection.findOne(query);
	res.send(result);
});

// router.get("/api/names", async (req, res) => {
// 	try {
// 		const cursor = figureCollection.find({}, { projection: { name: 1, _id: 0 } });
// 		const names = await cursor.toArray();
// 		console.log("names: ", names);
// 		res.send(names);
// 	} catch (error) {
// 		console.error("Error fetching names:", error);
// 		res.status(500).send("Error fetching names");
// 	}
// });

// const updateFigureLabels = async () => {
// 	try {
// 		const figures = await figureCollection.find().toArray();

// 		const updates = figures
// 			.map((figure) => {
// 				let newLabel = figure.label;
// 				const today = new Date();
// 				const releaseDate = new Date(figure.release);

// 				if (figure.quantity === 0) {
// 					newLabel = "Out Of Stock";
// 				} else if (figure.label === "Coming Soon" && releaseDate <= today) {
// 					newLabel = "Brand New";
// 				} else if (figure.label === "Brand New" && figure.quantity < 10) {
// 					newLabel = "Limited";
// 				}

// 				if (newLabel !== figure.label) {
// 					return {
// 						updateOne: {
// 							filter: { _id: figure._id },
// 							update: { $set: { label: newLabel } },
// 						},
// 					};
// 				}
// 				return null;
// 			})
// 			.filter((update) => update !== null);

// 		if (updates.length > 0) {
// 			await figureCollection.bulkWrite(updates);
// 			console.log("Labels updated successfully");
// 		} else {
// 			console.log("No labels to update");
// 		}
// 	} catch (error) {
// 		console.error("Error updating labels:", error);
// 	} finally {
// 		await client.close();
// 	}
// };
const updateLabels = async () => {
	try {
		const figures = await figureCollection.find().toArray();

		for (const figure of figures) {
			if (figure.quantity === 0) {
				figure.label = "Out Of Stock";
			} else if (figure.label === "Coming Soon" && figure.releaseDate <= new Date()) {
				figure.label = figure.quantity > 0 ? "Brand New" : "Out Of Stock";
			}
			// else if (figure.label === "Brand New" && figure.quantity < 10) {
			// 	figure.label = "Limited";
			// }

			// Update the figure in the collection
			await figureCollection.updateOne({ _id: figure._id }, { $set: { label: figure.label } });
		}

		console.log("Labels updated successfully!");
	} catch (error) {
		console.error("Error updating labels:", error);
	}
};

// Run the updateLabels function every hour (3600000 milliseconds)
setInterval(updateLabels, 3600000);

// Set up the interval to run the update function every 1 hour (3600000 milliseconds)
// setInterval(() => {
// 	updateFigureLabels().catch(console.error);
// }, 3600000);

module.exports = router;

// router.get("/", async (req, res) => {
// 	const cursor = figureCollection.find(
// 		{},
// 		{ projection: { _id: 1, series: 1, images: 1, name: 1, price: 1, offer: 1, label: 1 } }
// 	);

// 	// Alternative approach (using aggregation pipeline):
// 	// const result = await figureCollection.aggregate([
// 	//   { $project: { _id: 1, series: 1, images: { $slice: 1 }, name: 1, price: 1, offer: 1, label: 1 } }
// 	// ]).toArray();

// 	const result = await cursor.toArray();
// 	res.send(result);
// });
