/* -------------------------------------------------------------------------- */
/*                                payment api's                               */
/* -------------------------------------------------------------------------- */

const express = require("express");
const router = express.Router();
const { ObjectId, client } = require("../db.js");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const paymentCollection = client.db("animeFig").collection("payments");
const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res.status(401).send({ error: true, message: "unauthorized access" });
	}
	const token = authorization.split(" ")[1];

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		if (err) {
			return res.status(401).send({ error: true, message: "unauthorized access" });
		}
		req.decoded = decoded;
		next();
	});
};
// const verifyGeneralAdmin = async (req, res, next) => {
// 	const email = req.decoded.email;
// 	const query = { email: email };
// 	const user = await usersCollection.findOne(query);
// 	if (user?.role !== "general_admin") {
// 		return res.status(403).send({ error: true, message: "forbidden access!" });
// 	}
// 	next();
// };

router.post("/create-payment-intent",  async (req, res) => {
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

router.post("/payments_history",  async (req, res) => {
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

router.get("/", verifyJWT, async (req, res) => {
	const cursor = paymentCollection.find();
	const result = await cursor.toArray();
	res.send(result);
});

router.get("/user-payments", verifyJWT, async (req, res) => {
	try {
		// The email should now be available in req.decoded
		const userEmail = req.decoded.email;

		// Find the user in the usersCollection
		const user = await usersCollection.findOne({ email: userEmail });

		if (!user) {
			return res.status(404).send({ message: "User not found" });
		}

		// Use the user's _id to find their payments
		const cursor = paymentCollection.find({ userId: user._id });
		const result = await cursor.toArray();

		res.send(result);
	} catch (error) {
		console.error("Error fetching user payments:", error);
		res.status(500).send({ message: "Error fetching payment history" });
	}
});

module.exports = router;
