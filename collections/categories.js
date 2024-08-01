const express = require("express");
const router = express.Router();
const { client } = require("../db.js");
const categoryCollection = client.db("animeFig").collection("categories");

/* ----------------------------- categories api ----------------------------- */
router.get("/", async (req, res) => {
	const cursor = categoryCollection.find();
	const result = await cursor.toArray();
	res.send(result);
});

module.exports = router;
