/* Your code starts here */

var app = {};
var socket;
var name;
var userID;
var character;
var incr = 0;
var increment = 0;
var increase = 0;
var current;
//array for autocomplete options at start
var choiceOptions = [];

app.init = function() {
    //name = character;
    //init socket connect with server
    socket = io.connect();
    attachEvents();
};

var auto = completely(document.getElementById('js-ipt-text'), {
    fontSize: '18px',
    fontFamily: 'Arial',
    color: '#933',
});

var renderSubmissions = function() {
    var appPage = $('#app');
    appPage.append('<div id="submissions"></div>');
    var tplToCompile = $('#tpl_submissions').html();
    // var compiled = _.template(tplToCompile) ({
    // });
    $('#submissions').append(tplToCompile);

    attachEvents();
};

var destroySubmissions = function() {
    $('#submissions').remove();
    console.log('DESTRUCTION');
    // hash.location = '';
}

//***ALL THE EVENTS FUNCTIONS****
var attachEvents = function() {

    //****AUTOCOMPLETE STUFF****
    // auto.options = choiceOptions;
    auto.options = [];
    auto.repaint();
    // auto.hideDropDown();
    setTimeout(function() {
        auto.input.focus();
    }, 0);

    $('#inputBtn').off('click').on('click', function() {
        console.log('BUTTON CLICKED');
        var heSaid = $('#heSaid').val();
        var iSaid = $('#iSaid').val();
        var time = Date.now();
        console.log(heSaid+' : '+iSaid+' : ');

        $.post('/', {
            time: time,
            heSaid: heSaid,
            iSaid: iSaid,
        });
        alert('submitted!');
        destroySubmissions();
    });

    $('#feedBtn').off('click').on('click', function() {
        console.log('FEED CLICKED');
        //create submission div and fill template
        renderSubmissions();
    });

    $('#closeBtn').off('click').on('click', function() {
        //create submission div and fill template
        destroySubmissions();
    });


    //****SEND CHAT MESSAGE TO SERVER****
    $('#js-btn-send').off('click').on('click', function() {
        //after user clicks
        var userChat = auto.input.value;
        console.log("User Chat: " + userChat);
        //.emit submits or sends an event
        //you can name it anything and you can
        //attach anything (string, num etc.)

        auto.setText('');

        fillTemplate(userChat);

        setTimeout(function() {
            socket.emit('userResponse', {
                user: userID,
                userResponse: userChat, //,
                //currentChoice: current
            });
        }, 500);
    });

    auto.onEnter = function() {
        var userChat = auto.input.value;
        console.log("User Response: " + userChat);

        setTimeout(function() {
            socket.emit('userResponse', {
                user: userID,
                userResponse: userChat //,
                //currentChoice: current
            });
        }, 500);
        auto.setText('');

        fillTemplate(userChat);
    }
};

app.init();

var fillTemplate = function(v) {
    var tplToCompile = $('#tpl-user-chat').html();
    var compiled = _.template(tplToCompile)({
        response: v
    });

    $('#messages-container').append(compiled);

    //scroll to top
    var lastElementTop = $('.user-chat').last().offset().top;
    console.log(lastElementTop);
    var scrollAmount = lastElementTop;

    $('#chat-container').animate({
        scrollTop: $('#messages-container').innerHeight()
    }, 500);

    var responseID = '#' + v + increment;
    console.log(responseID);
    increment = increment + 1;

    setTimeout(function() {
        $(responseID).css("opacity", "1");
    }, 500);
};

//****RECEIVING CHOICE MADE****(listen for clients)
socket.on('botMessage', function(res) {


    //ATTACH AN IMAGE
    // if (res.data.background != undefined) {
    //     setTimeout(function() {
    //     console.log('in photo: '+res.data.background);
    //     var tplToCompilePhoto = $('#tpl-chat-image').html();
    //     var compiledPhoto = _.template(tplToCompilePhoto)({
    //         data: '<img src='+res.data.background+' width="100%">'
    //     });

    //     $('#messages-container').append(compiledPhoto);

    //     $('#chat-container').animate({
    //         scrollTop: $('#messages-container').innerHeight()
    //     }, 500);
    //     //}, 4000);
    // }

   // setTimeout(function() {
        var tplToCompile = $('#tpl-bot-chat').html();
        var compiled = _.template(tplToCompile)({
            timestamp: _.now(),
            data: res.data
        });

        //current = res.data.past;
        //choiceOptions = res.data.userChoices;

        $('#messages-container').append(compiled);

        $('#chat-container').animate({
            scrollTop: $('#messages-container').innerHeight()
        }, 500);

        var chatID = '#' + res.data.itemName + incr;
        console.log(chatID);
        incr = incr + 1;

        setTimeout(function() {
            $(chatID).css("opacity", "1");
        }, 500);
        attachEvents();
    //}, 5000);
});

//SERVER MESSAGE
//****RECEIVING CHAR INFO FROM SERVER****
// socket.on('playerChar', function(res) {
//     // console.log(res.data.msg);

//     character = res.data.character;

// });

//****START MESSAGE****
socket.on('startMessage', function(res) {
    var tplToCompile = $('#tpl-bot-chat').html();
    var compiled = _.template(tplToCompile)({
        timestamp: _.now(),
        data: res.data
    });
    //startChar = res.data.character;
    //choiceOptions = res.data.userChoices;

    // console.log("Choice Options: " + choiceOptions);
    //changed to .choice from #chat-container
    // $('#chat-container').append(compiled);
    $('#messages-container').append(compiled);

    var someArray = [];

    var chatID = '#' + res.data.itemName;

    setTimeout(function() {
        $(chatID).css("opacity", "1");
    }, 5000);

    // $('.Details').css('display', 'inline');
    $('.Messages').css('display', 'inline');
    $('.Middle').css('color', 'white');
    // $('.Middle').css('float','right');
    $('.Middle').css('margin-right', '10px');
    $('.server-msg').css('font-weight', 800);
    $('#server-message').css('text-align', 'center');
    $('#server-message').css('background-color', 'rgb(30,30,30)');
    // console.log(res.data);

    attachEvents();

    userID = res.data.user;
});