

var accountSid = 'ACbd3bde47dc6e6388dffee7928cd21eeb';
var authToken = "669112c3344b0c5b00dbc1e27463579a";
var client = require('twilio')(accountSid, authToken);

client.sendMessage({
	body: "Hey sexxy. What you doin' tonight?",
	to: "+17089800010",
	from: "+14703105000"
}, function(err, text) {
	if (!err) {
	console.log('you sent: '+text.body);
	console.log('current status of this text message is: '+text.status);	
	} else {
		console.log('err');
	}
});

app.listen(3000);