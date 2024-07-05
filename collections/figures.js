const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db");
const figureCollection = client.db("animeFig").collection("figures");

// >> figures api
router.get("/", async (req, res) => {
	const cursor = figureCollection.find();
	const result = await cursor.toArray();
	res.send(result);
});

router.get("/:id", async (req, res) => {
	const id = req.params.id;
	const query = { _id: new ObjectId(id) };
	const result = await figureCollection.findOne(query);
	res.send(result);
});

router.post("/", async (req, res) => {
	const figures = req.body;
	const result = await figureCollection.insertOne(figures);
	res.send(result);
});

module.exports = router;
