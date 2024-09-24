const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const uri = process.env.Mongo_URI;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

// let dbConnection;

// const connectToDatabase = async () => {
// 	if (!dbConnection) {
// 		await client.connect();
// 		dbConnection = client.db("animeFig");
// 		console.log("Connected to MongoDB");
// 	}
// 	return {
// 		figureCollection: dbConnection.collection("figures"),
// 		usersCollection: dbConnection.collection("users"),
// 		categoryCollection: dbConnection.collection("categories"),
// 		paymentCollection: dbConnection.collection("payments"),
// 	};
// };
let cachedClient = null;
let cachedDb = null;

const connectToDatabase = async () => {
	if (cachedClient && cachedDb) {
		return {
			figureCollection: cachedDb.collection("figures"),
			usersCollection: cachedDb.collection("users"),
			categoryCollection: cachedDb.collection("categories"),
			paymentCollection: cachedDb.collection("payments"),
		};
	}

	const client = new MongoClient(uri, {
		serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
	});

	await client.connect();
	cachedClient = client;
	cachedDb = client.db("animeFig");
	return {
		figureCollection: cachedDb.collection("figures"),
		usersCollection: cachedDb.collection("users"),
		categoryCollection: cachedDb.collection("categories"),
		paymentCollection: cachedDb.collection("payments"),
	};
};

module.exports = { connectToDatabase, ObjectId, client };
