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

router.get("/", verifyJWT, async (req, res) => {
	const cursor = paymentCollection.find();
	const result = await cursor.toArray();
	res.send(result);
});

router.get("/user_payments", verifyJWT, async (req, res) => {
	try {
		const { email } = req.query;

		if (!email) {
			return res.status(400).json({ error: "Email is required" });
		}

		const userPayments = await paymentCollection.find({ email: email }).toArray();

		res.json(userPayments);
	} catch (error) {
		console.error("Error fetching user payments:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/user_payment", verifyJWT, async (req, res) => {
	try {
		const { _id } = req.query;

		if (!_id) {
			return res.status(400).json({ error: "Id is required" });
		}

		const objectId = new ObjectId(_id);

		const userPayments = await paymentCollection.find({ _id: objectId }).toArray();
		console.log("userPayments: ", userPayments);

		res.json(userPayments);
	} catch (error) {
		console.error("Error fetching user payments:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
