if ("geolocation" in navigator) {
	navigator.geolocation.getCurrentPosition(function (position) {
		console.log("Latitude is :", position.coords.latitude);
		console.log("Longitude is :", position.coords.longitude);
		// You'd need to reverse geocode these coordinates to get the country
	});
} else {
	console.log("Geolocation is not available");
}
