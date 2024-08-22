/* -------------------------------------------------------------------------- */
/*                                payment api's                               */
/* -------------------------------------------------------------------------- */

const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db.js");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const paymentCollection = client.db("animeFig").collection("payments");

router.post("/create-payment-intent", async (req, res) => {
	const { grandTotal } = req.body;
	const amount = parseInt(grandTotal * 100);
	const paymentIntent = await stripe.paymentIntents.create({
		amount: amount,
		currency: "usd",
		payment_method_types: ["card"],
	});
	res.send({
		clientSecret: paymentIntent.client_secret,
	});
});

router.post("/payments_history", async (req, res) => {
	const { email, transactionId, grandTotal, date, quantity, orderStatus, cartItems } = req.body;

	// Transform the cartItems into the desired orderedFigs structure
	const orderedFigs = cartItems.map((item) => ({
		figId: item.figId,
		figName: item.figName,
		figImage: item.figImg,
		figLink: item.figLink,
		figPrice: item.figPrice,
		quantity: item.quantity,
		totalPrice: item.totalPrice,
	}));

	const paymentRecord = {
		email,
		transactionId,
		grandTotal: parseFloat(grandTotal),
		date,
		quantity,
		orderStatus,
		orderedFigs,
	};

	const result = await paymentCollection.insertOne(paymentRecord);
	res.send(result);
});

router.get("/", async (req, res) => {
	const cursor = paymentCollection.find();
	const result = await cursor.toArray();
	res.send(result);
});

module.exports = router;
