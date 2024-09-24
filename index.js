const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

// mongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.Mongo_URI;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		const figureCollection = client.db("animeFig").collection("figures");
		const paymentCollection = client.db("animeFig").collection("payments");
		const usersCollection = client.db("animeFig").collection("users");
		const categoryCollection = client.db("animeFig").collection("categories");

		const verifyGeneralAdmin = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			if (user?.role !== "general_admin") {
				return res.status(403).send({ error: true, message: "forbidden access!" });
			}
			next();
		};

		/* ----------------------------- categories api ----------------------------- */
		app.get("/categories", async (req, res) => {
			const cursor = categoryCollection.find();
			const result = await cursor.toArray();
			res.send(result);
		});

		/* -------------------------------------------------------------------------- */
		/*                                  users api                                 */
		/* -------------------------------------------------------------------------- */
		// Create user
		app.post("/users", async (req, res) => {
			const user = req.body;
			const query = { email: user.email };
			const existingUser = await usersCollection.findOne(query);

			if (existingUser) {
				return res.send({ message: "user already exists" });
			}

			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

		// >> get users
		app.get("/users", async (req, res) => {
			let query = {};

			if (req.query?.email) {
				query.email = {
					$regex: req.query.email,
					$options: "i",
				};
			}
			if (req.query?.name) {
				query.name = { $regex: req.query.name, $options: "i" };
			}
			if (req.query?.role) {
				query.role = { $regex: req.query.role, $options: "i" };
			}

			const result = await usersCollection.find(query).toArray();
			res.send(result);
		});

		app.get("/users/:role/:email", verifyJWT, async (req, res) => {
			const role = req.params.role;
			const email = req.params.email;

			if (email !== req.decoded.email) {
				return res.send({ [role]: false });
			}

			const query = { email: email };
			const user = await usersCollection.findOne(query);
			const result = { [role]: user?.role === role };
			res.send(result);
		});

		// # get users by id
		app.get("/users/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await usersCollection.findOne(query);
			res.send(result);
		});

		app.patch("/users/:email", verifyJWT, verifyGeneralAdmin, async (req, res) => {
			const { email } = req.params;
			const { role } = req.body;

			try {
				await usersCollection.updateOne({ email: email }, { $set: { role: role } });

				res.status(200).send({
					message: "User role updated successfully",
				});
			} catch (error) {
				res.status(500).send({
					error: "Internal server error",
				});
			}
		});

		app.delete("/users/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await usersCollection.deleteOne(query);
			res.send(result);
		});

		/* -------------------------------------------------------------------------- */
		/*                                 figures api                                */
		/* -------------------------------------------------------------------------- */
		/* ------------------------------ post figures ------------------------------ */
		app.post("/figures", async (req, res) => {
			const figures = req.body;
			const result = await figureCollection.insertOne(figures);
			res.send(result);
		});

		/* ---------------------------- TODO: delete this --------------------------- */
		app.get("/figures", async (req, res) => {
			const cursor = figureCollection.find();
			const result = await cursor.toArray();
			res.send(result);
		});

		app.get("/figures/features", async (req, res) => {
			try {
				const result = await figureCollection
					.aggregate([
						{
							$project: {
								image: { $arrayElemAt: ["$images", 0] },
								name: 1,
								link: 1,
								series: 1,
								_id: 1,
							},
						},
						{ $sort: { _id: 1 } },
						{
							$group: {
								_id: "$series",
								doc: { $first: "$$ROOT" },
							},
						},
						{ $replaceRoot: { newRoot: "$doc" } },
						{ $limit: 4 },
					])
					.toArray();

				res.send(result);
			} catch (error) {
				res.status(500).send({ message: "Failed to fetch featured figures", error });
			}
		});

		app.get("/figures/latest_figures", async (req, res) => {
			try {
				const detailedFigures = await figureCollection
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
					.sort({ _id: -1 })
					.limit(15)
					.toArray();

				const additionalFigures = await figureCollection
					.find()
					.sort({ _id: -1 })
					.skip(15)
					.limit(4)
					.project({
						_id: 1,
						images: { $slice: 1 },
					})
					.toArray();

				const combinedResult = {
					detailedFigures,
					additionalFigures,
				};

				res.send(combinedResult);
			} catch (error) {
				console.error("Failed to fetch latest figures:", error);
				res.status(500).send({ error: "Failed to fetch latest figures" });
			}
		});

		app.get("/figures/coming_soon", async (req, res) => {
			try {
				const detailedFigures = await figureCollection
					.find({ label: "Coming Soon" })
					.sort({ _id: -1 })
					.limit(9)
					.project({
						_id: 1,
						name: 1,
						images: { $slice: 1 },
						price: 1,
						series: 1,
						offer: 1,
						link: 1,
						label: 1,
						release: 1,
					})
					.toArray();

				const additionalFigures = await figureCollection
					.find({ label: "Coming Soon" })
					.sort({ _id: -1 })
					.skip(9)
					.limit(4)
					.project({
						_id: 1,
						images: { $slice: 1 },
					})
					.toArray();

				const combinedResult = {
					detailedFigures,
					additionalFigures,
				};

				res.send(combinedResult);
			} catch (error) {
				console.error("Failed to fetch 'Coming Soon' figures:", error);
				res.status(500).send({ error: "Failed to fetch 'Coming Soon' figures" });
			}
		});

		app.get("/figures/pre_owned", async (req, res) => {
			try {
				const detailedFigures = await figureCollection
					.find({ label: "Pre Owned" })
					.sort({ _id: -1 })
					.limit(9)
					.project({
						_id: 1,
						name: 1,
						images: { $slice: 1 },
						price: 1,
						series: 1,
						offer: 1,
						link: 1,
						label: 1,
						release: 1,
					})
					.toArray();

				const additionalFigures = await figureCollection
					.find({ label: "Pre Owned" })
					.sort({ _id: -1 })
					.skip(9)
					.limit(4)
					.project({
						_id: 1,
						images: { $slice: 1 },
					})
					.toArray();

				const combinedResult = {
					detailedFigures,
					additionalFigures,
				};

				res.send(combinedResult);
			} catch (error) {
				console.error("Failed to fetch 'Coming Soon' figures:", error);
				res.status(500).send({ error: "Failed to fetch 'Coming Soon' figures" });
			}
		});

		app.get("/figures/with_offer", async (req, res) => {
			try {
				const figuresWithOffer = await figureCollection
					.find({ offer: { $ne: null } })
					.sort({ _id: -1 })
					.limit(9)
					.toArray();

				const additionalFigures = await figureCollection
					.find({ label: "Pre Owned" })
					.sort({ _id: -1 })
					.skip(9)
					.limit(4)
					.project({
						_id: 1,
						images: { $slice: 1 },
					})
					.toArray();

				const combinedResult = {
					figuresWithOffer,
					additionalFigures,
				};

				res.send(combinedResult);
			} catch (error) {
				console.error("Failed to fetch figures with offer:", error);
				res.status(500).send({ error: "Failed to fetch figures with offer" });
			}
		});

		app.get("/figures/series", async (req, res) => {
			try {
				const seriesFigures = await figureCollection
					.aggregate([
						{
							$group: {
								_id: "$series",
								doc: { $first: "$$ROOT" },
							},
						},
						{
							$replaceRoot: { newRoot: "$doc" },
						},
						{
							$project: {
								_id: 1,
								images: { $slice: ["$images", 1] },
								series: 1,
							},
						},
					])
					// .sort({ _id: 1 })
					// .skip()
					.limit(8)
					.toArray();

				res.send(seriesFigures);
			} catch (error) {
				console.error("Failed to fetch figures by series:", error);
				res.status(500).send({ error: "Failed to fetch figures by series" });
			}
		});

		app.get("/figures/series_home", async (req, res) => {
			try {
				const seriesFigures = await figureCollection
					.aggregate([
						{
							$group: {
								_id: "$series",
								doc: { $first: "$$ROOT" },
							},
						},
						{
							$replaceRoot: { newRoot: "$doc" },
						},
						{
							$project: {
								_id: 1,
								images: { $slice: ["$images", 1] },
								series: 1,
							},
						},
					])
					.sort({ _id: 1 })
					.toArray();

				res.send(seriesFigures);
			} catch (error) {
				console.error("Failed to fetch figures by series:", error);
				res.status(500).send({ error: "Failed to fetch figures by series" });
			}
		});

		app.get("/figures/character", async (req, res) => {
			try {
				const seriesFigures = await figureCollection
					.aggregate([
						{
							$group: {
								_id: "$character",
								doc: { $first: "$$ROOT" },
							},
						},
						{
							$replaceRoot: { newRoot: "$doc" },
						},
						{
							$project: {
								_id: 1,
								images: { $slice: ["$images", 1] },
								character: 1,
							},
						},
					])
					.sort({ _id: -1 })
					.skip(10)
					.limit(5)
					.toArray();

				res.send(seriesFigures);
			} catch (error) {
				console.error("Failed to fetch figures by character:", error);
				res.status(500).send({ error: "Failed to fetch figures by character" });
			}
		});

		/* --------------------------- get similar figures -------------------------- */
		app.get("/figures/similar_series", async (req, res) => {
			try {
				const { link } = req.query;

				if (!link) {
					return res.status(400).send({ error: "Figure link is required" });
				}

				const currentFigure = await figureCollection.findOne({ link });

				if (!currentFigure) {
					return res.status(404).send({ error: "Figure not found" });
				}

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

		app.get("/figures/series", async (req, res) => {});

		/* ------------------------- get similar characters ------------------------- */
		app.get("/figures/similar_characters", async (req, res) => {
			try {
				const { link } = req.query;

				if (!link) {
					return res.status(400).send({ error: "Character link is required" });
				}

				const currentCharacter = await figureCollection.findOne({ link });

				if (!currentCharacter) {
					return res.status(404).send({ error: "Character not found" });
				}

				const similarCharacters = await figureCollection
					.find(
						{
							character: currentCharacter.character,
							link: { $ne: currentCharacter.link },
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
		app.get("/figures/card", async (req, res) => {
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
		app.get("/figures/search_box", async (req, res) => {
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
		app.post("/figures/:productId/comments", async (req, res) => {
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

		app.post("/figures/:productId/comments/:commentId/react", async (req, res) => {
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
		app.delete("/figures/:productId/comments/:commentId", async (req, res) => {
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
		app.get("/figures/collections", async (req, res) => {
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
		app.get("/figures/all-filters", async (req, res) => {
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

		// TODO: get this done before deploy
		app.get("/figures/form_value", async (req, res) => {
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
		app.put("/figures/:id", async (req, res) => {
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
		app.delete("/figures/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await figureCollection.deleteOne(query);
			res.send(result);
		});

		/* ---------------------- get individual figure by link --------------------- */
		app.get("/figures/:link", async (req, res) => {
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
					const releaseDate = new Date(figure.release);
					const currentDate = new Date();

					const releaseDateUTC = Date.UTC(
						releaseDate.getFullYear(),
						releaseDate.getMonth(),
						releaseDate.getDate()
					);
					const currentDateUTC = Date.UTC(
						currentDate.getFullYear(),
						currentDate.getMonth(),
						currentDate.getDate()
					);

					if (figure.quantity === 0) {
						figure.label = "Out Of Stock";
					} else if (figure.label === "Coming Soon" && releaseDateUTC <= currentDateUTC) {
						figure.label = figure.quantity > 0 ? "Brand New" : "Out Of Stock";
					}
					// else if (figure.label === "Brand New" && figure.quantity < 10) {
					// 	figure.label = "Limited";
					// }

					await figureCollection.updateOne({ _id: figure._id }, { $set: { label: figure.label } });
				}

				console.log("Labels updated successfully!");
			} catch (error) {
				console.error("Error updating labels:", error);
			}
		};

		// Run the updateLabels function every hour (3600000 milliseconds)
		setInterval(updateLabels, 3600000);

		/* -------------------------------------------------------------------------- */
		/*                                payments api                                */
		/* -------------------------------------------------------------------------- */
		// const verifyGeneralAdmin = async (req, res, next) => {
		// 	const email = req.decoded.email;
		// 	const query = { email: email };
		// 	const user = await usersCollection.findOne(query);
		// 	if (user?.role !== "general_admin") {
		// 		return res.status(403).send({ error: true, message: "forbidden access!" });
		// 	}
		// 	next();
		// };

		app.post("/payments/create-payment-intent", async (req, res) => {
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

		app.post("/payments/payments_history", async (req, res) => {
			const { email, transactionId, grandTotal, date, quantity, orderStatus, cartItems, zoneDetail } =
				req.body;

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
				zoneDetail,
			};

			const result = await paymentCollection.insertOne(paymentRecord);
			res.send(result);
		});

		app.get("/payments", verifyJWT, async (req, res) => {
			const cursor = paymentCollection.find();
			const result = await cursor.toArray();
			res.send(result);
		});

		app.get("/payments/user_payments", verifyJWT, async (req, res) => {
			try {
				const { email } = req.query;

				if (!email) {
					return res.status(400).json({ error: "Email is required" });
				}

				const userPayments = await paymentCollection
					.find({ email: email })
					.sort({ _id: 1 })
					.toArray();

				res.json(userPayments);
			} catch (error) {
				console.error("Error fetching user payments:", error);
				res.status(500).json({ error: "Internal server error" });
			}
		});

		app.get("/payments/user_payment", verifyJWT, async (req, res) => {
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

		app.delete("/payments/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await paymentCollection.deleteOne(query);
			res.send(result);
		});

		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You successfully connected to MongoDB!");
	} finally {
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("animeFig server is running");
});

app.listen(port, () => {
	console.log(`animeFig server is running at ${port}`);
});
