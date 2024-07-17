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
	const cursor = figureCollection.find();
	const result = await cursor.toArray();
	res.send(result);
});

// get similar figures
router.get("/similar_series", async (req, res) => {
	try {
		const { link } = req.query;

		if (!link) {
			return res.status(400).send({ error: "Figure link is required" });
		}

		// Find the current figure based on the link
		const currentFigure = await figureCollection.findOne({ link });

		if (!currentFigure) {
			return res.status(404).send({ error: "Figure not found" });
		}

		// Find similar figures based on the series, excluding the current figure
		const similarFigures = await figureCollection
			.find(
				{
					series: currentFigure.series,
					link: { $ne: currentFigure.link },
				},
				{
					projection: {
						_id: 1,
						name: 1,
						images: { $slice: 1 },
						price: 1,
						series: 1,
						offer: 1,
						link: 1,
						label: 1,
						release: 1,
					},
				}
			)
			.sort({ _id: -1 })
			.toArray();

		res.send(similarFigures);
	} catch (error) {
		console.error("Error fetching similar figures:", error);
		res.status(500).send({ error: "Internal server error" });
	}
});

// get similar characters
router.get("/similar_characters", async (req, res) => {
	try {
		const { link } = req.query;

		if (!link) {
			return res.status(400).send({ error: "Character link is required" });
		}

		// Find the current character based on the link
		const currentCharacter = await figureCollection.findOne({ link });

		if (!currentCharacter) {
			return res.status(404).send({ error: "Character not found" });
		}

		// Find similar characters based on the series, excluding the current character
		const similarCharacters = await figureCollection
			.find(
				{
					character: currentCharacter.character,
					link: { $ne: currentCharacter.link }, // Exclude the current character
				},
				{
					projection: {
						_id: 1,
						name: 1,
						images: { $slice: 1 },
						price: 1,
						series: 1,
						offer: 1,
						link: 1,
						label: 1,
						release: 1,
					},
				}
			)
			.sort({ _id: -1 })
			.toArray();

		res.send(similarCharacters);
	} catch (error) {
		console.error("Error fetching similar characters:", error);
		res.status(500).send({ error: "Internal server error" });
	}
});

router.get("/card", async (req, res) => {
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
					release: 1,
				},
			}
		)
		.sort({ _id: -1 });

	const result = await cursor.toArray();
	res.send(result);
});

router.get("/search_box", async (req, res) => {
	const { name, category, series } = req.query;
	const query = {};
	const conditions = [];

	if (name) {
		conditions.push({ name: { $regex: new RegExp(name, "i") } });
	}
	if (category) {
		conditions.push({ category: { $regex: new RegExp(category, "i") } });
	}
	if (series) {
		conditions.push({ series: { $regex: new RegExp(series, "i") } });
	}

	if (conditions.length > 0) {
		query.$or = conditions;
	}

	try {
		const results = await figureCollection
			.find(query, { projection: { _id: 1, name: 1, link: 1, series: 1 } })
			.limit(10)
			.toArray();

		res.json(results);
	} catch (error) {
		console.error("Error fetching search results:", error);
		res.status(500).json({ error: "Error fetching search results" });
	}
});

router.post("/:productId/comments", async (req, res) => {
	const figId = req.params.productId;
	const comment = req.body;

	const figs = await figureCollection.findOne({ _id: new ObjectId(figId) });
	if (!figs) {
		return res.status(404).send({ message: "Product not found" });
	}

	comment._id = new ObjectId(); // Generate a new ObjectId for the comment
	comment.createdAt = new Date();

	const result = await figureCollection.updateOne(
		{ _id: new ObjectId(figId) },
		{ $push: { comments: comment } },
		{ upsert: true }
	);

	res.send(result);
});

// make a delete api for comments
router.delete("/:productId/comments/:commentId", async (req, res) => {
	const figId = req.params.productId;
	const commentId = req.params.commentId;

	try {
		const figs = await figureCollection.findOne({ _id: new ObjectId(figId) });
		if (!figs) {
			return res.status(404).send({ message: "Product not found" });
		}

		const result = await figureCollection.updateOne(
			{ _id: new ObjectId(figId) },
			{ $pull: { comments: { _id: new ObjectId(commentId) } } }
		);

		if (result.modifiedCount === 0) {
			return res.status(404).send({ message: "Comment not found" });
		}

		res.send({ message: "Comment deleted successfully" });
	} catch (error) {
		res.status(500).send({ message: "An error occurred", error: error.message });
	}
});

router.get("/collections", async (req, res) => {
	const { page, limit, name, category, series, character, sort, order, label } = req.query;

	const pageInt = parseInt(page) || 1;
	const limitInt = parseInt(limit) || 12;
	const skip = (pageInt - 1) * limitInt;

	const query = {};
	if (name) query.name = new RegExp(name, "i");
	if (category) query.category = category;
	if (series) query.series = series;
	if (character) query.character = character;
	if (label) query.label = label;

	const sortOptions = {};
	if (sort) {
		sortOptions[sort] = order === "asc" ? 1 : -1;
	} else {
		sortOptions._id = -1;
	}

	try {
		const cursor = figureCollection
			.find(query, {
				projection: {
					_id: 1,
					name: 1,
					images: { $slice: 1 },
					price: 1,
					series: 1,
					category: 1,
					character: 1,
					offer: 1,
					link: 1,
					release: 1,
					label: 1,
				},
			})
			.sort(sortOptions)
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

router.get("/all-filters", async (req, res) => {
	try {
		const figures = await figureCollection
			.find(
				{},
				{
					projection: {
						_id: 1,
						name: 1,
						series: 1,
						category: 1,
						character: 1,
						label: 1,
					},
				}
			)
			.sort({ _id: -1 })
			.toArray();

		res.send({ figures });
	} catch (error) {
		console.error("Error fetching all filters:", error);
		res.status(500).send("Error fetching all filters");
	}
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

const updateLabels = async () => {
	try {
		const figures = await figureCollection.find().toArray();

		for (const figure of figures) {
			if (figure.quantity === 0) {
				figure.label = "Out Of Stock";
			} else if (figure.label === "Coming Soon" && figure.release <= new Date()) {
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

module.exports = router;
