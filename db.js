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

let dbConnection;

const connectToDatabase = async () => {
	if (!dbConnection) {
		await client.connect();
		dbConnection = client.db("animeFig");
		console.log("Connected to MongoDB");
	}
	return {
		figureCollection: dbConnection.collection("figures"),
		addedFigureCollection: dbConnection.collection("addedFigure"),
		usersCollection: dbConnection.collection("users"),
		categoryCollection: dbConnection.collection("categories"),
	};
};

module.exports = { connectToDatabase, ObjectId, client };
