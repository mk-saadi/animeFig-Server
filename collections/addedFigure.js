const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db");
const addedFigureCollection = client.db("animeFig").collection("addedFigure");

// # main get function
router.get("/", async (req, res) => {
	let query = {};

	if (req.query?.email) {
		query = { email: req.query.email };
	}
	if (req.query.search) {
		query.name = { $regex: req.query.search, $options: "i" };
	}
	// if (req.params.category) {
	// 	if (
	// 		req.params.category == "Scale Figures" ||
	// 		req.params.category == "Bishoujo Figures" ||
	// 		req.params.category == "Figma" ||
	// 		req.params.category == "Nendoroid"
	// 	) {
	// 		query.category = req.params.category;
	// 	} else {
	// 		query.category = { $regex: req.params.category, $options: "i" };
	// 	}
	// }
	const result = await addedFigureCollection.find(query).sort({ price: -1 }).toArray();
	res.send(result);
});
// const limit = parseInt(req.query.limit) || 20;     .limit(limit)

// # get function by category
router.get("/category", async (req, res) => {
	const category = req.query.category;
	if (!category) {
		return res.status(400).send({ error: "Category query parameter is required" });
	}
	const projection = {
		name: 1,
		img: 1,
		price: 1,
		_id: 1,
		category: 1,
	};
	const cursor = addedFigureCollection.find({ category: category }, { projection: projection });
	const result = await cursor.toArray();
	res.send(result);
});

// # pagination api below
router.get("/pagination", async (req, res) => {
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
router.get("/totalAddedFigure", async (req, res) => {
	const result = await addedFigureCollection.estimatedDocumentCount();
	res.send({ totalAddedFigure: result });
});
router.post("/addedFigureById", async (req, res) => {
	const ids = req.body;
	const objectIds = ids.map((id) => new ObjectId(id));
	const query = { _id: { $in: objectIds } };
	const result = await addedFigureCollection.find(query).toArray();
	res.send(result);
});

// # get latest figures
router.get("/latest", async (req, res) => {
	const cursor = addedFigureCollection.find().sort({ _id: -1 }).limit(5);
	const result = await cursor.toArray();
	res.send(result);
});

// # get figures by id
router.get("/:id", async (req, res) => {
	const id = req.params.id;
	const query = { _id: new ObjectId(id) };
	const result = await addedFigureCollection.findOne(query);
	res.send(result);
});

// # get figures by series
// router.get("/series/:series", async (req, res) => {
// 	const series = req.params.series;
// 	const cursor = addedFigureCollection.find({ series: series });
// 	const result = await cursor.toArray();
// 	res.send(result);
// });

// # add figure to collection
router.post("", async (req, res) => {
	const figure = req.body;
	const result = await addedFigureCollection.insertOne(figure);
	res.send(result);
});

// # update figure
router.put("/:id", async (req, res) => {
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

// # delete figure
router.delete("/:id", async (req, res) => {
	const id = req.params.id;
	const query = { _id: new ObjectId(id) };
	const result = await addedFigureCollection.deleteOne(query);
	res.send(result);
});

module.exports = router;
