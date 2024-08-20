/* -------------------------------------------------------------------------- */
/*                                payment api's                               */
/* -------------------------------------------------------------------------- */

const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db.js");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const figureCollection = client.db("animeFig").collection("figures");
const paymentCollection = client.db("animeFig").collection("payments");

// Create a payment intent
router.post("/create-payment-intent", async (req, res) => {
	const { cartItems, grandTotal } = req.body;
	console.log("grandTotal: ", grandTotal);

	// Create a PaymentIntent with the order amount and currency
	const paymentIntent = await stripe.paymentIntents.create({
		amount: Math.round(grandTotal * 100), // Stripe works with smallest currency unit (e.g., cents)
		currency: "usd",
		automatic_payment_methods: {
			enabled: true,
		},
	});

	console.log("paymentIntent: ", paymentIntent);

	res.send({
		clientSecret: paymentIntent.client_secret,
	});
});

// Store payment and order details
router.post("/complete-payment", async (req, res) => {
	const { paymentIntentId, userId, cartItems, totalPrice, grandTotal } = req.body;

	// Store payment details in the paymentCollection
	const paymentRecord = {
		userId: new ObjectId(userId),
		paymentIntentId,
		cartItems,
		totalPrice,
		grandTotal,
		createdAt: new Date(),
	};
	console.log("paymentRecord", paymentRecord);

	const result = await paymentCollection.insertOne(paymentRecord);
	console.log("complete-payment result : ", result);

	// Optionally, clear the user's cart or handle post-payment logic

	res.send({ success: true, result });
});

module.exports = router;
