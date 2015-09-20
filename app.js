//JS in-class 3/3/2015

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var Parse = require('node-parse-api').Parse;
var server = require('http').Server(app);
var io = require('socket.io')(server);
var sentiment = require('sentiment');
var port = 9000;
var messageArray = [];
var choicesFunc = [];

var options = {
    app_id: '9X7zv5iCaJ4LlAEN9wD1A3886geFH942KB3zo4um',
    api_key: 'rDEd5ONpK0b00uh3zaUMLFdNBCJphoaPMLq4th1y' //Rest api key (not master key)
};

var parse = new Parse(options);
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());
app.use(function(req, res, next) {
    // Setup a Cross Origin Resource sharing
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    // var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // console.log('incoming request from ---> ' + ip);
    // Show the target URL that the user just hit
    var url = req.originalUrl;
    console.log('### requesting ---> ' + url);
    next();
});

app.use('/', express.static(__dirname + '/public'));

server.listen(port, function() {
    console.log('Server running at port:' + port);
});



parse.findMany('responses', '', function(err, res) {
    if (err) {
        console.log('this is fucked up');
    }
    var resResults = res.results;


    for (var j = 0; j < resResults.length; j++) {
        for (var i = 0; i < resResults.length; i++) {
            if (resResults[i].messageIndex == j) {
                messageArray.push(resResults[i]);

            }
        }
    }

    for (var i = 0; i < messageArray.length; i++) {
        console.log("Message index is:" + messageArray[i].messageIndex);
        console.log("True index is: " + i);
        // messageArray[i].messageIndex = i;
        // console.log("New message index is:" + messageArray[i].messageIndex);
        // console.log("New true index is: " + i);
    }


    // console.log(messageArray[i].messageText);
    if (messageArray.length == resResults.length) {
        console.log('Parse Successful!');
    }

});

app.post('/', function(req, res) {
    console.log(req.body);
    // console.log(req.body);
    // console.log(req.body['p_food']);
    // console.log(req.body['p_quantity']);
    // console.log(req.body['p_expiration']);
    //if (id != existing id), create new...(insert)...else update

    parse.insert('submissions', {
        // time: req.body[time],
        heSaid: req.body.heSaid,
        iSaid: req.body.iSaid
    }, function(err, data) {
        if (err) {
            console.log(err);
        } else {
            console.log('Parse: Inserted item');
            res.json({
                status: 'OK'
            });
        }
    });

});



var userIDs = [];
var users = [];

//.on = listener function (for an event)
//everything on the server happens in .on scope
io.on('connection', function(socket) {
    /*––––––––––– SOCKET.IO starts here –––––––––––––––*/

    /*
	.on
	.emit
	.broadcast

    */
    //logging user id
    var sock = socket.id;
    console.log('The user ' + sock + ' just connected.');

    userIDs.push(socket.id);

    setTimeout(function() {
        var startMessage = messageArray[0];

        console.log("Start Message Data: ");
        console.log(startMessage.messageText);
        console.log(startMessage.objectId);

        users.push({
            "socketID": socket.id,
            "index": users.length - 1,
            "name": '',
            "currentMessage": messageArray[0],
            "nextMessage": {},
            "gameStarted": false,
            "size": ''
        });


        // for (var i in messageArray) {
        //     if (messageArray[i].uniqueID == 0) {
        //         startMessage = messageArray[i];
        //     }
        // }

        var newUserIndex = users.length - 1;
        io.to(users[newUserIndex].socketID).emit('startMessage', {
            data: {
                itemName: startMessage.objectId,
                user: users[newUserIndex].index,
                msg: startMessage.messageText
            }
        });

        console.log("Start Emit Done!");

        users[newUserIndex].gameStarted = true;

    }, 100);

    //WHAT TO DO WHEN USER SENDS A CHOICE
    socket.on('userResponse', function(res) {

        console.log(res.userResponse);
        console.log("Their full res is:");
        console.log(res);
        console.log("Their socketID is:");
        console.log(socket.id);

        parseResponse(res.userResponse, socket.id, res.user);
        var sentimentTest = sentiment(res.userResponse, {
            'not': -3
        });
        console.log(sentimentTest.score);
    });

    //parse choice so that it can be compared against choiceName trigger words in executeChoice function
    function parseResponse(_userResponse, _userID, _userIndex) {
        console.log("working");
        var response = _userResponse.toLowerCase();
        var parsedResponse = response.split(/[\s,.?!&:()]+/);
        //var parsedResponse = response.split(/[\s,.&:()]+?!/); //?!
        if (response.indexOf("?") !== -1) {
            parsedResponse.push("?");
        }
        if (response.indexOf("!") !== -1) {
            parsedResponse.push("!");
        }
        console.log("parsedResponse: " + parsedResponse);

        var thisUser = {};
        for (var u in users) {
            if (_userID == users[u].socketID) {
                thisUser = users[u];
            }
        }

        console.log("This User is: " + thisUser.socketID);
        console.log("Current message for this User: " + thisUser.currentMessage.messageText);

        thisUser.nextMessage = pickNextMessage(thisUser.currentMessage, parsedResponse);
        console.log("Next message for this User: " + thisUser.nextMessage.messageText);
        console.log("Index of next message: " + thisUser.nextMessage.messageIndex);
        console.log("TRUE index of next message: " + messageArray.indexOf(thisUser.nextMessage));

        thisUser.currentMessage = thisUser.nextMessage;

        io.to(thisUser.socketID).emit('botMessage', {
            data: {
                itemName: thisUser.currentMessage.objectId, //nextChoiceName,//nextMessage[index].messageText;
                msg: thisUser.currentMessage.messageText
                //userChoices: nextChoicesForUser,
                //background: newBackground,
                // past: pastChoice
            }
        });
        //compareChoice(parsedChoice, _currentChoice, _userID, _userName);
    }

    //var nextMessage = {};

    //var userResponse;

    function pickNextMessage(_currentMessage, _parsedResponse) {
        var pickedMessage = {};
        console.log("Pick Next Message Called");
        //console.log("Next Nodes of this message: " + _currentMessage.nextNodes.length);
        if (_currentMessage.nextNodes !== undefined) {
            console.log("I know this message has nextNodes");
            if (_currentMessage.nextNodes.length == 1) { //if there's only one path to take...
                nextMessageIndex = _currentMessage.nextNodes[0]; //pulls the only number in nextNodes array and sets it as index
                pickedMessage = messageArray[nextMessageIndex]; //pulls the next message object based on index from nextNodes
                return pickedMessage;
                console.log("This message has one possible path");
                console.log("Next message is: " + pickedMessage.messageText);
                //} else if (_currentMessage.nextNodes.length > 1) {
            } else {
                console.log("This message has multiple possible paths");
                pickedMessage = matchTriggers(_parsedResponse, _currentMessage.nextNodes); //call matchtriggers, but with limits to specific options
                return pickedMessage;
                console.log("Next message is: " + pickedMessage);
            }
        } else {
            console.log("I know nextNodes is undefined");
            //} else if (nextNodes == undefined) {
            //var allNextNodes = getFullDBIndex();
            pickedMessage = matchTriggers(_parsedResponse);
            console.log("Next Picked Message: " + pickedMessage.messageText);
            console.log("Index of next message: " + pickedMessage.messageIndex);
            return pickedMessage;
            //pickedMessage = matchTriggers(_parsedResponse, allNextNodes); //match triggers for everything
        }



    }

    function matchTriggers(parsedRes, nextNodesArray) {
        console.log("Match Triggers called");

        var limitRandomToNextNodes;

        // if (nextNodesArray == undefined) {
        //     console.log("NextNodesArray is undefined...getting fullDB");
        //     nextNodesArray = getFullDBIndex();
        //     limitRandomToNextNodes = false;
        // } else {
        //     limitRandomToNextNodes = true;
        //     console.log("NextNodesArray is defined...limiting to next nodes");
        // }

        if (nextNodesArray != undefined) {
            limitRandomToNextNodes = true;
            console.log("NextNodesArray is defined...limiting to next nodes");
        } else {
            nextNodesArray = getFullDBIndex();
            limitRandomToNextNodes = false;
        }

        console.log("NextNodesArray Length is: " + nextNodesArray.length);

        var matchedMessage = {};

        var matchCounts = [];
        var matchCountMax = 0;

        for (var n = 0; n < nextNodesArray.length; n++) {

            var matchCount = 0;

            var indexToCheck = nextNodesArray[n];
            console.log("Next nodes Index to check: " + indexToCheck);
            console.log("Triggers at nextNodes: " + messageArray[indexToCheck].triggers);
            nextTriggersArray = messageArray[indexToCheck].triggers;

            if (nextTriggersArray != undefined) {
                //for (var thisTerm in parsedRes) {
                for (var w = 0; w < parsedRes.length; w++) {

                    var termToCompare = parsedRes[w];

                    //for (var t in nextTriggersArray) {
                    for (var t = 0; t < nextTriggersArray.length; t++) {

                        var triggerToCheck = nextTriggersArray[t];
                        //OR FOR WEIGHTED MATCH:
                        ////var triggerToCheck = tempTriggers[t].value;

                        if (termToCompare == triggerToCheck) {
                            matchCount++;
                            //FOR WEIGHTED MATCH:
                            //matchCount += tempTriggers[t].weight;
                        }
                    }

                }
            }

            if (matchCount > matchCountMax) {
                matchCountMax = matchCount;
            }

            if (matchCount > 0 && matchCount >= matchCountMax) {
                matchCounts.push({
                    "indexOfMessage": indexToCheck,
                    "matchedTriggers": matchCount
                });
            }
        }

        if (matchCounts.length < 1) {
            if (limitRandomToNextNodes) {
                console.log("NextNodes limited but no triggers matched");
                //var randomIndex = getRandomIndex(nextNodesArray.length);
                var randomIndex = Math.floor(Math.random() * nextNodesArray.length);
                var randomNextNode = nextNodesArray[randomIndex];
                matchedMessage = messageArray[randomNextNode];
                return matchedMessage;
            } else {
                //randomIndex
                console.log("No matches - I am sending a random response!");
                matchedMessage = randomResponse(); // THIS NEEDS TO BE SET
                return matchedMessage;
            }
        } else if (matchCounts.length == 1) {
            console.log("Only one matched message");
            var indexOfNextMessage = matchCounts[0].indexOfMessage;
            matchedMessage = messageArray[indexOfNextMessage];
            return matchedMessage;
        } else {
            console.log("Picking a matched message from several matched triggers");
            for (var m = 0; m < matchCounts.length; m++) {
                if (matchCounts[m].matchedTriggers < matchCountMax) {
                    matchCounts.splice(m, 1);
                }
            }

            var randomIndex = Math.floor(Math.random() * matchCounts.length);
            var indexOfNextMessage = matchCounts[randomIndex].indexOfMessage;
            matchedMessage = messageArray[indexOfNextMessage];
            return matchedMessage;

        }
        //console.log("Next Matched Message: " + matchedMessage.messageText);
        //return matchedMessage;
    }

    function getRandomIndex(arrayLength) {
        var randI = Math.floor(Math.random() * arrayLength);
        return randI;
    }

    function randomResponse() {
        //var randomIndex;

        //if (nodesToSearch == undefined){
        var allAvailIndices = getFullDBIndex(true);
        randomIndex = Math.floor(Math.random() * allAvailIndices.length);
        //} else {
        //  randomIndex = Math.floor(Math.random()*nodesToSearch.length);
        //}
        var randRes = messageArray[randomIndex];
        return randRes;
    }

    function getFullDBIndex(onlyNewTopics) {
        if (onlyNewTopics == undefined) {
            onlyNewTopics = false;
        }


        if (onlyNewTopics) {
            var fullDBIndex = [];

            for (var i = 0; i < messageArray.length; i++) {
                if (messageArray[i].canBeNewTopic == true) {
                    //fullDBIndex.push(messageArray[i].messageIndex);
                    fullDBIndex.push(i);
                    //console.log("Adding to full DB");
                    // console.log("messageIndex pushed: " + messageIndex);
                }
            }
            console.log("FullDBLength: " + fullDBIndex.length);
            return fullDBIndex;

        } else {
            var fullDBIndex = [];

            for (var i = 0; i < messageArray.length; i++) {
                //fullDBIndex.push(messageArray[i].messageIndex);
                fullDBIndex.push(i);
                //console.log("messageIndex pushed: " + messageIndex);
            }
            console.log("FullDBLength: " + fullDBIndex.length);
            return fullDBIndex;
        }



    }


    // //compare choice against existing choiceNameArray and choiceName if only one word
    // function compareChoice(uniqueID, triggers, socketID, user) {
    //     console.log('currentChoice: ' + currentChoice);

    //     //if the user responds with only one word, use that word and compare to choiceName
    //     if (choiceArray.length < 2) {
    //         // for (var a in choiceArray){
    //         //     for (var b in choices){
    //         //         if (choiceArray[a] == choices[b].choiceName){

    //         //         }
    //         //     }
    //         // }

    //         for (var c in choiceArray) {
    //             //acount for simple yes/no answer
    //             if (choiceArray[c] == 'yes' || choiceArray[c] == 'no' || choiceArray[c] == 'me' || choiceArray[c] == 'you' || choiceArray[c] == 'lee' || choiceArray[c] == 'sam' || choiceArray[c] == 'jessie' || choiceArray[c] == 'alex') {

    //                 var userChoiceName = choiceArray[c] + '_' + currentChoice;
    //                 console.log('userChoiceName: ' + userChoiceName);

    //                 // for (var n in choices) {
    //                 // if (userChoiceName == choices[n].choiceName) {
    //                 // console.log('choices[n].choiceName: ' + choices[n].choiceName);
    //                 executeChoice(userChoiceName, socketID, user);
    //                 // } else {
    //                 //     executeChoice('error2', socketID, user);
    //                 // }
    //                 // }

    //             } else {
    //                 var match = false;
    //                 for (var y in choices) {
    //                     if (choiceArray[c] == choices[y].choiceName) {
    //                         match = true;
    //                         executeChoice(choices[y].choiceName, socketID, user);
    //                     }
    //                 }
    //                 if (!match) {
    //                     executeChoice('error2', socketID, user);
    //                 }
    //             }
    //         }
    //     } else {
    //         //run through the choiceNameArray and increment match counter when finding matches
    //         for (var y in choices) {
    //             for (var x in choices[y].choiceNameArray) {
    //                 for (var z in choiceArray) {
    //                     if (choiceArray[z] == choices[y].choiceNameArray[x]) {
    //                         choices[y].match = choices[y].match + 1;
    //                     }
    //                 }
    //             }
    //         }
    //         //find highest match number and user that choiceName
    //         var highestMatch = 1;
    //         var highestMatchIndex = -1;
    //         for (var y in choices) {
    //             if (choices[y].match > highestMatch) {
    //                 highestMatch = choices[y].match;
    //                 highestMatchIndex = y;
    //             }
    //             choices[y].match = 0;
    //         }
    //         if (highestMatchIndex > -1) {
    //             var userChoiceName = choices[highestMatchIndex].choiceName;
    //             console.log("MATCHED CHOICE NAME: " + userChoiceName);
    //             executeChoice(userChoiceName, socketID, user);
    //         } else {
    //             // send error message
    //             executeChoice('error', socketID, user);
    //         }
    //     }
    // }

    // function executeChoice(userChoice, userID, userName) {
    //     var nextChoiceName;
    //     var nextMsgForUser;
    //     var nextChoicesForUser;
    //     var newBackground;
    //     var pastChoice;

    //     for (var i = 0; i < choices.length; i++) {
    //         //if user's choice matches with choice in the array then execute consequence function
    //         if (userChoice == choices[i].choiceName) {
    //             //run through choicesFunc array
    //             for (var j in choicesFunc) {
    //                 if (choices[i].choiceName == choicesFunc[j].choiceName) {
    //                     // console.log("consequence func called: "+choicesFunc[j].choiceConsequence);
    //                     choicesFunc[j].choiceConsequence(userName);
    //                 };
    //             }


    //==============================================
    //THIS STUFF COULD STILL BE GOOD / USEFUL:
    //==============================================

    //             pastChoice = choices[i].choiceName;
    //             //reset nextChoices
    //             nextChoiceName = choices[i].choiceName;
    //             nextMsgForUser = choices[i].messageText;
    //             nextChoicesForUser = choices[i].nextChoices;
    //             newBackground = choices[i].bgImage;
    //             //push names into choiceVisitor array
    //             choices[i].choiceVisitors.push(userName);

    //             // console.log("Next Msg: " + nextMsgForUser + " | " + nextChoicesForUser + " : " + userID + " | " + userName);
    //         }
    //     }
    //     //emit choice response to specific user
    //     //change to users.sam;
    //     io.to(userID).emit('choiceResponse', {
    //         data: {
    //             itemName: nextMessage.objectId, //nextChoiceName,//nextMessage[index].messageText;
    //             msg: nextMessage.messageText,
    //             //userChoices: nextChoicesForUser,
    //             //background: newBackground,
    //             past: pastChoice
    //         }
    //     });

    // }

    //when a client connects to server, broadcast to everyone
    io.sockets.emit('current users', {
        //attaching whole array (users) in currentUsers object
        // currentUsers: players
    });

    var nodeCounter;

    // //WHAT TO DO WHEN USER SENDS A CHOICE
    // socket.on('userResponse', function(res) {
    //     console.log(res.userResponse);
    //     console.log("Their full res is:");
    //     console.log(res);

    //     parseResponse(res.uniqueID, res.userResponse, socket.id, res.user);
    // });

    //****LISTENS FOR USER DISCONNECT****
    socket.on('disconnect', function() {
        console.log('a user ' + socket.id + ' just disconnected.');
        //use indexOf to find index of res.id
        var indexToRemove = users.indexOf(socket.id);

        if (indexToRemove > -1) {
            //indexToRemove will return index number of contect provided
            //or -1 if not found
            //second arg is for how many indexes to remove
            users.splice(indexToRemove, 1);
            console.log('current users: ' + users.length);
            gameStarted = false;
        }
    });

    //send back id to client
    socket.emit('greetings', {
        message: "Hi",
        data: socket.id
    });
});



// function readyToAccuse() {
//     for (var i in players) {
//         if (players[i].visited.length > 2 && players[i].visited.length % 3 == 0) {
//             console.log("YES 3 is the magic number");
//             io.to(players[i].id).emit('accusePlayers', {
//                 data: {
//                     msg: 'Based on what we\'ve seen, do you think you know who killed Lee? Yes or no?',
//                     currentChoice: 'accuse'
//                 }
//             });
//         }
//     }
// }