/* -------------------------------------------------------------------------- */
/*                                figures api's                               */
/* -------------------------------------------------------------------------- */

const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db.js");
const figureCollection = client.db("animeFig").collection("figures");
const paymentCollection = client.db("animeFig").collection("payments");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

/* ------------------------------ post figures ------------------------------ */
router.post("/", async (req, res) => {
	const figures = req.body;
	const result = await figureCollection.insertOne(figures);
	res.send(result);
});

/* ---------------------------- TODO: delete this --------------------------- */
router.get("/", async (req, res) => {
	const cursor = figureCollection.find();
	const result = await cursor.toArray();
	res.send(result);
});

/* --------------------------- get similar figures -------------------------- */
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

/* ------------------------- get similar characters ------------------------- */
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

/* ----------------------------- figure card api ---------------------------- */
router.get("/card", async (req, res) => {
	const cursor = figureCollection
		.find(
			{},
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
		.sort({ _id: -1 });

	const result = await cursor.toArray();
	res.send(result);
});

/* ------------------ search figure by name/category/series ----------------- */
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

/* ------------------------------ post comments ----------------------------- */
router.post("/:productId/comments", async (req, res) => {
	const figId = req.params.productId;
	const comment = req.body;

	const figs = await figureCollection.findOne({ _id: new ObjectId(figId) });
	if (!figs) {
		return res.status(404).send({ message: "Product not found" });
	}

	comment._id = new ObjectId();
	comment.createdAt = new Date();

	const result = await figureCollection.updateOne(
		{ _id: new ObjectId(figId) },
		{ $push: { comments: comment } },
		{ upsert: true }
	);

	res.send(result);
});

/* ------------------------ like or dislike a comment ----------------------- */
// router.patch("/:productId/comments/:commentId", async (req, res) => {
// 	const figId = req.params.productId;
// 	const commentId = req.params.commentId;
// 	const { like } = req.body;

// 	const figs = await figureCollection.findOne({ _id: new ObjectId(figId) });
// 	if (!figs) {
// 		return res.status(404).send({ message: "Product not found" });
// 	}

// 	const result = await figureCollection.updateOne(
// 		{ _id: new ObjectId(figId), "comments._id": new ObjectId(commentId) },
// 		{ $set: { "comments.$.like": like } }
// 	);

// 	res.send(result);
// });
router.post("/:productId/comments/:commentId/react", async (req, res) => {
	const { productId, commentId } = req.params;
	const { userId, action } = req.body;

	if (!["like", "dislike"].includes(action)) {
		return res.status(400).send({ message: "Invalid action" });
	}

	try {
		const fig = await figureCollection.findOne({ _id: new ObjectId(productId) });
		if (!fig) {
			return res.status(404).send({ message: "Product not found" });
		}

		const update =
			action === "like"
				? {
						$addToSet: { "comments.$.likes": userId },
						$pull: { "comments.$.dislikes": userId },
				  }
				: {
						$addToSet: { "comments.$.dislikes": userId },
						$pull: { "comments.$.likes": userId },
				  };

		const result = await figureCollection.updateOne(
			{ _id: new ObjectId(productId), "comments._id": new ObjectId(commentId) },
			update
		);

		if (result.matchedCount === 0) {
			return res.status(404).send({ message: "Comment not found" });
		}

		res.send({ message: `Comment ${action}d successfully` });
	} catch (error) {
		console.error("Error updating comment reaction:", error);
		res.status(500).send({ message: "Internal server error" });
	}
});

/* -------------------- delete api for individual comment ------------------- */
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

/* ---------------------------- main get function --------------------------- */
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

/* ------- get the figure count for each categories/series/characters ------- */
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

/* ------------------------------ update figure ----------------------------- */
router.put("/:id", async (req, res) => {
	const id = req.params.id;
	const filter = { _id: new ObjectId(id) };
	const options = { upsert: true };

	const uf = req.body;
	const figures = {
		$set: {
			name: uf.name,
			images: uf.images,
			price: uf.price,
			quantity: uf.quantity,
			description: uf.description,
			brand: uf.brand,
			category: uf.category,
			series: uf.series,
			character: uf.character,
			label: uf.label,
			offer: uf.offer,
			dimension: uf.dimension,
			release: uf.release,
		},
	};
	const result = await figureCollection.updateOne(filter, figures, options);
	res.send(result);
});

/* --------------------------- delete figure by id -------------------------- */
router.delete("/:id", async (req, res) => {
	const id = req.params.id;
	const query = { _id: new ObjectId(id) };
	const result = await figureCollection.deleteOne(query);
	res.send(result);
});

/* ---------------------- get individual figure by link --------------------- */
router.get("/:link", async (req, res) => {
	const link = req.params.link;
	const query = { link: link };
	const result = await figureCollection.findOne(query);
	res.send(result);
});

/* ----------------- function to update figure automatically ---------------- */
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
/* ----- Run the updateLabels function every hour (3600000 milliseconds) ---- */
setInterval(updateLabels, 3600000);

module.exports = router;
