//Discord labyrinth bot by Ian Oberst
//Version 1.0


const token = ''; //HIDE THIS BEFORE PUBLIC POSTING


const Discord = require('discord.js');
const client = new Discord.Client();
var running = false; //Check for current game 
var state = 'open'; //state can be open, starting, event
var playerNum = 0; //number of characters for bookkeeping
const prefix = '>'; //what the current messaging prefix is
//This is a holder for all the character data using a struct. characters.push({id: playerNum, name: args[0], hp:  parseInt(args[1]), will: parseInt(args[2]), player: message.author, inventory: ''})
var characters = [];
var currentRoom = 0; //The index number of the current room in the roomList
var exitRoom;
var entranceRoom;
//The setting for the maze's width and height
var mazeWidth = 10;
var mazeHeight = 5;
//Arrays holding room objects, room type descriptions, and event descriptions
var roomList = [];
var typeDescriptions = [];
var eventDescriptions = [];
var roomRNG = [9, 10, 11, 11, 11, 12, 12, 12, 13, 13, 13, 14, 14, 14, 15, 15, 15, 15, 15, 15];

client.once('ready', () => {
    console.log('Ready!');
});
//Message handling code. Only processes code that starts with the prefix and doesn't originate from another bot. 
client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'help') {
        message.channel.send('use ' + prefix + 'list for a list of commands. Remind the creator to add more to this.');

    }
    //provides a list of commands
    if (command === 'list') {
        message.channel.send('At all times: ' + prefix + ' help, ' + prefix + 'start, ' + prefix + 'summary, ' + prefix + 'end. while state is open: ' + prefix + 'map, ' + prefix + 'map events.' +
        ' ' + prefix + 'north or up or n, east or right or e, south or down or s, west or left or w all to navigate the maze. ' + prefix + 'start, While starting: ' + prefix + 'finish, ' + prefix + 'add. ' +
        'during events: ' + prefix + 'success, ' + prefix + 'failure, ' + prefix + 'ignore, ' + prefix + 'done');

    }
    //Assistant function to allow user to check the current state and game objects
    if (command === 'summary') {
        message.channel.send('state: ' + state + '\n' + 'number of characters: ' + playerNum);
        if (playerNum > 0) {
            message.channel.send('characters: ');
            var temp = '';
            for (i = 0; i < characters.length; i++) {
                temp = temp + ('Name:' + characters[i].name + ' Hp:' + characters[i].hp + ' Will:' + characters[i].will + '\n');
            }
            message.channel.send(temp);
        }
    }
    //this block of logic is for processing commands in the "open" state
    if (state == 'open') {
        //start up game. If already running, don't do anything. If not started, run start up and set state to starting.
        if (command === 'start') {
            if (running == true) {
                message.channel.send('Already running!');
            }
            if (running == false) {
                message.channel.send('Starting up. Use ' + prefix + 'add to add your characters and ' + prefix + 'finish when you are done to start gameplay.');
                running = true;
                state = 'starting';
            }
        }
        //ends the current game, whipes the setup. should probably make this a function. 
        if (command === 'end') {
            if (running == false) {
                message.channel.send('No game running!');
            }
            if (running == true) {
                message.channel.send('Good bye!');
                running = false;
                playerNum = 0;
                characters = [];
                //players = [''];
                //hp = [];
                //will = [];
                roomList = [];
            }
        }
        //dice roller. currently rolls 1-6, currently utility fluff.
        if (command === 'roll') {
            message.channel.send(Math.floor((Math.random() * 6) + 1));
        }
        if (command === 'test2') {
            var temp = '';
            for(i=0;i<=15;i++){
                temp = emojicodes[i];
                message.channel.send(temp);
                temp = '';
            }
        }
        //test method for the maze contents
        if (command === 'test') {
            if (roomList.length >= 1) {
                message.channel.send('here is the list of rooms.');
                var temp;
                for (var i = 0; i < roomList.length; i++) {
                    temp = ('Room# ' + i + ' Y: ' + roomList[i].height + ' X: ' + roomList[i].width + ' Type: ' + roomList[i].type + ' Visited?: ' + roomList[i].visited + ' Event: ' + roomList[i].event);
                    message.channel.send(temp);
                }
            }
            else {
                message.channel.send('No maze built!');
            }
        }
        //allows for players to raw set their stats in situations where the normal system doesn't meet their needs.
        if(command == 'set'){
            if (args[0] == 'hp') {
                if(Number.isInteger(parseInt(args[1]))){
                    for (i = 0; i < playerNum; i++) {
                        if (message.author == characters[i].player) {
                            characters[i].hp = args[1];
                            message.channel.send(characters[i].name + ' Hp: ' + characters[i].hp);
                        }
                    }
                }
            }
            if (args[0] == 'will') {
                if(Number.isInteger(parseInt(args[1]))){
                    for (i = 0; i < playerNum; i++) {
                        if (message.author == characters[i].player) {
                            characters[i].will = args[1];
                            message.channel.send(characters[i].name + ' Will: ' + characters[i].will);
                        }
                    }
                }
            }
        }
        //Visuallizes the maze for the players. Takes 2 modifying arguments, debug and events. Uses the visualizerHelper function
        if (command === 'map') {
            if (roomList.length >= 1) {
                var temp = '';
                var count = 0;
                if (args[0] == 'debug') {
                    for (i = 1; i <= mazeHeight; i++) {
                        if(temp.length >= (2000 - (mazeWidth * 90)))
                        {
                            message.channel.send(temp);
                            temp = '';
                        }
                        for (j = 1; j <= mazeWidth; j++) {
                            temp = visualizerHelper(count, temp, 'type');
                            count++;
                        }
                        temp = (temp + '\n');
                    }
                    message.channel.send(temp);
                }
                else if (args[0] == 'events') {
                    for (i = 1; i <= mazeHeight; i++) {
                        for (j = 1; j <= mazeWidth; j++) {
                            if (roomList[count].visited == true) {
                                temp = visualizerHelper(count, temp, 'event');
                            }
                            else {
                                temp = (temp + '?? ');
                            }
                            count++;
                        }
                        temp = (temp + '\n');
                    }
                    message.channel.send(temp);
                }
                else {
                    for (i = 1; i <= mazeHeight; i++) {
                        for (j = 1; j <= mazeWidth; j++) {
                            if (roomList[count].visited == true) {
                                temp = visualizerHelper(count, temp, 'type');
                            }
                            else {
                                temp = (temp + emojicodes[0]);
                            }
                            count++;
                        }
                        temp = (temp + '\n');
                    }
                    message.channel.send(temp);
                }
            }
            else {
                message.channel.send('No maze built!');
            }
        }

        //These are the directional controls for running the game. It checks the current room's type and the destination room's type to see if it is a legal move to make
        if (command === 'north' || command === 'up' || command === 'n') {
            if (roomList.length >= 1) {
                if (currentRoom - mazeWidth >= 0) {
                    if (roomList[currentRoom].type == 2 || roomList[currentRoom].type == 5 || roomList[currentRoom].type == 6 || roomList[currentRoom].type == 10
                        || roomList[currentRoom].type == 12 || roomList[currentRoom].type == 13 || roomList[currentRoom].type == 14 || roomList[currentRoom].type == 15) {

                        if (roomList[currentRoom - mazeWidth].type == 4 || roomList[currentRoom - mazeWidth].type == 7 || roomList[currentRoom - mazeWidth].type == 8 ||
                            roomList[currentRoom - mazeWidth].type == 10 || roomList[currentRoom - mazeWidth].type == 11 || roomList[currentRoom - mazeWidth].type == 12 ||
                            roomList[currentRoom - mazeWidth].type == 14 || roomList[currentRoom - mazeWidth].type == 15) {
                            currentRoom = currentRoom - mazeWidth;
                            message.channel.send('you went north and arrived in ' + typeDescriptions[roomList[currentRoom].type].description);
                            if (roomList[currentRoom].visited != true || eventDescriptions[roomList[currentRoom].event].type == 1) {
                                message.channel.send(applyEvent(roomList[currentRoom].event));
                            }
                            roomList[currentRoom].visited = true;
                            if (roomList[currentRoom].exit == true) {
                                message.channel.send('You escaped!');
                                //end game

                            }
                        }
                        else {
                            message.channel.send('The passage ends, you cannot go that way.');
                        }
                    }
                    else {
                        message.channel.send('That is a wall, you cannot go this way.');
                    }
                }
                else {
                    message.channel.send('You have reached the end of the maze, you cannot go that way.');
                }
            }
            else {
                message.channel.send('No maze built!');
            }
        }
        if (command === 'east'|| command === 'left' || command === 'e') {
            if (roomList.length >= 1) {
                if ((currentRoom + 1) % mazeWidth != 0) {
                    if (roomList[currentRoom].type == 3 || roomList[currentRoom].type == 6 || roomList[currentRoom].type == 7 || roomList[currentRoom].type == 9
                        || roomList[currentRoom].type == 11 || roomList[currentRoom].type == 13 || roomList[currentRoom].type == 14 || roomList[currentRoom].type == 15) {

                        if (roomList[currentRoom + 1].type == 1 || roomList[currentRoom + 1].type == 5 || roomList[currentRoom + 1].type == 8 ||
                            roomList[currentRoom + 1].type == 9 || roomList[currentRoom + 1].type == 11 || roomList[currentRoom + 1].type == 12 ||
                            roomList[currentRoom + 1].type == 13 || roomList[currentRoom + 1].type == 15) {
                            currentRoom = currentRoom + 1;
                            message.channel.send('you went east and arrived in ' + typeDescriptions[roomList[currentRoom].type].description);
                            if (roomList[currentRoom].visited != true || eventDescriptions[roomList[currentRoom].event].type == 1) {
                                message.channel.send(applyEvent(roomList[currentRoom].event));
                            }
                            roomList[currentRoom].visited = true;

                            if (roomList[currentRoom].exit == true) {
                                message.channel.send('You escaped!');
                                //end game

                            }
                        }
                        else {
                            message.channel.send('The passage ends, you cannot go that way.');
                        }
                    }
                    else {
                        message.channel.send('That is a wall, you cannot go this way.');
                    }
                }
                else {
                    message.channel.send('You have reached the end of the maze, you cannot go that way.');
                }
            }
            else {
                message.channel.send('No maze built!');
            }
        }
        if (command === 'south'|| command === 'down' || command === 's') {
            if (roomList.length >= 1) {
                if ((currentRoom + mazeWidth) < (mazeWidth * mazeHeight)) {
                    if (roomList[currentRoom].type == 4 || roomList[currentRoom].type == 7 || roomList[currentRoom].type == 8 || roomList[currentRoom].type == 10
                        || roomList[currentRoom].type == 11 || roomList[currentRoom].type == 12 || roomList[currentRoom].type == 14 || roomList[currentRoom].type == 15) {
                        if (roomList[currentRoom + mazeWidth].type == 2 || roomList[currentRoom + mazeWidth].type == 5 || roomList[currentRoom + mazeWidth].type == 6 ||
                            roomList[currentRoom + mazeWidth].type == 10 || roomList[currentRoom + mazeWidth].type == 12 || roomList[currentRoom + mazeWidth].type == 13 ||
                            roomList[currentRoom + mazeWidth].type == 14 || roomList[currentRoom + mazeWidth].type == 15) {
                            currentRoom = currentRoom + mazeWidth;
                            message.channel.send('you went South and arrived in ' + typeDescriptions[roomList[currentRoom].type].description);
                            if (roomList[currentRoom].visited != true || eventDescriptions[roomList[currentRoom].event].type == 1) {
                                message.channel.send(applyEvent(roomList[currentRoom].event));
                            }
                            roomList[currentRoom].visited = true;

                            if (roomList[currentRoom].exit == true) {
                                message.channel.send('You escaped!');
                                //end game

                            }
                        }
                        else {
                            message.channel.send('The passage ends, you cannot go that way.');
                        }
                    }
                    else {
                        message.channel.send('That is a wall, you cannot go this way.');
                    }
                }
                else {
                    message.channel.send('You have reached the end of the maze, you cannot go that way.');
                }
            }
            else {
                message.channel.send('No maze built!');
            }
        }
        if (command === 'west'|| command === 'left' || command === 'w') {
            if (roomList.length >= 1) {
                if (currentRoom % mazeWidth != 0) {
                    if (roomList[currentRoom].type == 1 || roomList[currentRoom].type == 5 || roomList[currentRoom].type == 8 || roomList[currentRoom].type == 9
                        || roomList[currentRoom].type == 11 || roomList[currentRoom].type == 12 || roomList[currentRoom].type == 13 || roomList[currentRoom].type == 15) {

                        if (roomList[currentRoom - 1].type == 3 || roomList[currentRoom - 1].type == 6 || roomList[currentRoom - 1].type == 7 ||
                            roomList[currentRoom - 1].type == 9 || roomList[currentRoom - 1].type == 11 || roomList[currentRoom - 1].type == 13 ||
                            roomList[currentRoom - 1].type == 14 || roomList[currentRoom - 1].type == 15) {
                            currentRoom = currentRoom - 1;
                            message.channel.send('you went west and arrived in ' + typeDescriptions[roomList[currentRoom].type].description);
                            if (roomList[currentRoom].visited != true || eventDescriptions[roomList[currentRoom].event].type == 1) {
                                message.channel.send(applyEvent(roomList[currentRoom].event));
                            }
                            roomList[currentRoom].visited = true;

                            if (roomList[currentRoom].exit == true) {
                                message.channel.send('You escaped!');
                                //end game

                            }
                        }
                        else {
                            message.channel.send('The passage ends, you cannot go that way.');
                        }
                    }
                    else {
                        message.channel.send('That is a wall, you cannot go this way.');
                    }
                }
                else {
                    message.channel.send('You have reached the end of the maze, you cannot go that way.');
                }
            }
            else {
                message.channel.send('No maze built!');
            }
        }
    }
    if (command === 'lateadd') {
        if (!args.length) {
            message.channel.send(`You didn't provide any arguments, ${message.author}! Proper format is ` + prefix + `lateadd name hp will`);
        }
        else if (args.length > 3) {
            message.channel.send(`Too many arguments, ${message.author}! Proper format is ` + prefix + `lateadd name hp will`);
        }
        else {
            if (Number.isInteger(parseInt(args[1])) && Number.isInteger(parseInt(args[2]))) {
                characters.push({id: playerNum, name: args[0], hp:  parseInt(args[1]), will: parseInt(args[2]), player: message.author, inventory: ''})
                playerNum++;
                message.channel.send(args[0] + ' added with Hp:' + args[1] + ' and will:' + args[2]);
            }
            else {
                message.channel.send('Character addition failed. Proper format is ' + prefix + 'lateadd [name] [hp] [will]. you wrote ' + prefix + 'lateadd '
                    + args[0] + ' ' + args[1] + ' ' + args[2]);
            }
        }
    }
    //this block of logic is for processing commands in the "Starting" state
    else if (state == 'starting') {
        if (command === 'add') {
            if (!args.length) {
                message.channel.send(`You didn't provide any arguments, ${message.author}! Proper format is ` + prefix + `add name hp will`);
            }
            else if (args.length > 3) {
                message.channel.send(`Too many arguments, ${message.author}! Proper format is ` + prefix + `add name hp will`);
            }
            else {
                if (Number.isInteger(parseInt(args[1])) && Number.isInteger(parseInt(args[2]))) {
                    characters.push({id: playerNum, name: args[0], hp:  parseInt(args[1]), will: parseInt(args[2]), player: message.author, inventory: ''})
                    playerNum++;
                    message.channel.send(args[0] + ' added with Hp:' + args[1] + ' and will:' + args[2]);
                }
                else {
                    message.channel.send('Character addition failed. Proper format is ' + prefix + 'add [name] [hp] [will]. you wrote ' + prefix + 'add '
                        + args[0] + ' ' + args[1] + ' ' + args[2]);
                }
            }
        }
        //ends the setup state and moves on to general gameplay. 
        if (command === 'finish') {
            if (playerNum > 0) {
                state = 'open';
                for (i = 1; i <= mazeHeight; i++) {
                    for (j = 1; j <= mazeWidth; j++) {
                        //uses the roomRNG to adjust maze difficulty and selection type. 
                        var temp = Math.floor(Math.random() * roomRNG.length);
                        roomList.push({
                            height: i, width: j, type: roomRNG[temp],
                            event: Math.floor((Math.random() * 20) + 1), visited: false, entrance: false, exit: false
                        });
                    }
                }
                entranceRoom = Math.floor((Math.random() * roomList.length));
                roomList[entranceRoom].event = 0;
                roomList[entranceRoom].type = 15;
                //makes it more likely that the maze will be solvable by making the rooms surrounding the entrance 15's
                if (entranceRoom % mazeWidth != 0) {
                    roomList[entranceRoom - 1].type = 15;
                }
                if ((entranceRoom + mazeWidth) < (mazeWidth * mazeHeight)) {
                    roomList[entranceRoom + mazeWidth].type = 15;
                }
                if ((entranceRoom + 1) % mazeWidth != 0) {
                    roomList[entranceRoom + 1].type = 15;
                }
                if (entranceRoom - mazeWidth >= 0) {
                    roomList[entranceRoom - mazeWidth].type = 15;
                }
                roomList[entranceRoom].visited = true;
                roomList[entranceRoom].entrance = true;

                currentRoom = entranceRoom;
                exitRoom = entranceRoom;
                //Makes sure the exit and entrance are different 
                while (exitRoom == entranceRoom) {
                    exitRoom = Math.floor((Math.random() * roomList.length));
                }
                roomList[exitRoom].event = 0;
                roomList[exitRoom].type = 15;
                roomList[exitRoom].exit = true;
                roomList[exitRoom].visited = true;

                message.channel.send('Done with setup');
                var temp = '';
                var count = 0;
                for (i = 1; i <= mazeHeight; i++) {
                    for (j = 1; j <= mazeWidth; j++) {
                        if (roomList[count].visited == true) {
                            temp = visualizerHelper(count, temp, 'type');
                        }
                        else {
                            temp = (temp + emojicodes[0]);
                        }
                        count++;
                    }
                    temp = (temp + '\n');
                }
                message.channel.send(temp);

                //debug information
                //message.channel.send('Starting room is x: ' + roomList[entranceRoom ].width + ' y: ' + roomList[entranceRoom ].height);
                //message.channel.send('Exit room is x: ' + roomList[exitRoom].width + ' y: ' + roomList[exitRoom].height);
                //message.channel.send('Maze is x: '+ mazeWidth + ' y: ' + mazeHeight);
            }
            else {
                message.channel.send('Need at least one player.');
            }
        }
    }
    else if (state == 'event') {
        if (command == 'success') {
            message.channel.send(eventDescriptions[roomList[currentRoom].event.win]);
            state = 'open';
        }
        else if (command == 'failure') {
            var temp = false;
            for (i = 0; i < playerNum; i++) {
                if (message.author == characters[i].player) {
                    temp = true;
                    characters[i].hp = (characters[i].hp - eventDescriptions[roomList[currentRoom].event].hp);
                    characters[i].will = (characters[i].will - eventDescriptions[roomList[currentRoom].event].will);
                    if (characters[i].hp <= 0 || characters[i].will <= 0) {
                        message.channel.send(eventDescriptions[roomList[currentRoom].event].loss + '\n ' 
                        + characters[i].name + ` has succumbed, ${message.author}!` + '\nhp: ' + characters[i].hp + '\nwill: ' + characters[i].will);
                        //could just remove character?
                    }
                    else {
                        message.channel.send(characters[i].name + '\nhp: ' + characters[i].hp + '\nwill: ' + characters[i].will);
                    }
                }
            }
            if(temp == false){
                message.channel.send('Is somebody messing around?');
            }
        }
        else if (command == 'ignore') {
            message.channel.send('you turned away');
            state = 'open';
        }
        else if (command == 'done') {
            message.channel.send('you completed the event');
            state = 'open';
        }
    }
});
//this is a modular function to make applying the events more concise
function applyEvent(eventNumber) {
    state = 'event';
    var text = 'error';
    if (eventDescriptions[eventNumber].type == 1) {
        text = ('A hazard blocks your path.\n' + eventDescriptions[eventNumber].description + '\nIts challenge rating is ' + eventDescriptions[eventNumber].check + '\nuse ' + prefix + 'success, ' + prefix + 'failure, or ' + prefix + 'ignore to continue gameplay.');
    }
    else if (eventDescriptions[eventNumber].type == 2) {
        text = ('its a trap!\n' + eventDescriptions[eventNumber].description + '\nThe challenge rating is ' + eventDescriptions[eventNumber].check + '\nuse ' + prefix + 'success or ' + prefix + 'failure to continue gameplay.');
        eventDescriptions[eventNumber].type = 'other';
    }
    else if (eventDescriptions[eventNumber].type == 3) {
        text = ('you found ' + eventDescriptions[eventNumber].description);
        eventDescriptions[eventNumber].type = 'other';
        //might want to add item handling
        state = 'open';
    }
    else {
        //do nothing, room is likely empty or otherwise disabled. 
        text = 'an empty room';
        state = 'open';
    }
    return text;
}
//This is a modular helper function for the visualizers
function visualizerHelper(count, temp, display) {
    if (display == 'type') {
        if (count == entranceRoom) {
            temp = temp + emojicodes[16];
        }
        else if (count == exitRoom) {
            temp = temp + emojicodes[17];
        }
        else{
            temp = temp + emojicodes[roomList[count].type];
        }
        
        return temp;
    }
    else {
        if (roomList[count].event < 10) {
            if (count == currentRoom) {
                temp = (temp + ' **' + roomList[count].event + '** ');
            }
            else if (count == entranceRoom) {
                temp = (temp + ' *' + roomList[count].event + '* ');
            }
            else if (count == exitRoom) {
                temp = (temp + ' __' + roomList[count].event + '__ ');
            }
            else {
                temp = (temp + ' ' + roomList[count].event + ' ');
            }
        }
        else {
            if (count == currentRoom) {
                temp = (temp + '**' + roomList[count].event + '** ');
            }
            else {
                temp = (temp + roomList[count].event + ' ');
            }
        }
        return temp;
    }
}

//These are the room type descriptions.
for (var i = 0; i <= 15; i++) {
    typeDescriptions.push({ type: i, description: '' });
}
typeDescriptions[1].description = 'a dead end from the west';
typeDescriptions[2].description = 'a dead end from the north';
typeDescriptions[3].description = 'a dead end from the east';
typeDescriptions[4].description = 'a dead end from the south';
typeDescriptions[5].description = 'a corner bending north and east';
typeDescriptions[6].description = 'a corner bending north and west';
typeDescriptions[7].description = 'a corner bending south and east';
typeDescriptions[8].description = 'a corner bending south and west';
typeDescriptions[9].description = 'a straight passage running east to west';
typeDescriptions[10].description = 'a straight passage running north to south';
typeDescriptions[11].description = 'a fork running east, south and west';
typeDescriptions[12].description = 'a fork running north, south and west';
typeDescriptions[13].description = 'a fork running north, east and west';
typeDescriptions[14].description = 'a fork running north, east and south';
typeDescriptions[15].description = 'a crossroads in every direction';

//These are the event descriptions and their effects. Types are 1 = hazard, 2 = trap, 3 = item, and 0 = other
for (var i = 0; i <= 31; i++) {
    eventDescriptions.push({ type: 1, description: '', damage: '', loss: '', win: '', hp: i, will: i, check: i });
}
eventDescriptions[0].type = 0;
eventDescriptions[0].description = 'the entrence or exit of the maze';
eventDescriptions[1].type = 2;
eventDescriptions[1].description = 'a test case for traps.';
eventDescriptions[1].damage = 'test case traps damage';
eventDescriptions[1].loss = 'test case traps loss';
eventDescriptions[1].win = 'test case traps win';
eventDescriptions[1].hp = 5;
eventDescriptions[1].will = 5;
eventDescriptions[1].check = 5;
eventDescriptions[2].type = 1;
eventDescriptions[2].description = 'a test case for hazards.';
eventDescriptions[2].damage = 'test case hazards damage';
eventDescriptions[2].loss = 'test case hazards loss';
eventDescriptions[2].win = 'test case hazards win';
eventDescriptions[2].hp = 5;
eventDescriptions[2].will = 5;
eventDescriptions[2].check = 5;
eventDescriptions[3].type = 3;
eventDescriptions[3].description = 'a test case for items.';
eventDescriptions[3].damage = 'test case items damage';
eventDescriptions[3].loss = 'test case items loss';
eventDescriptions[3].win = 'test case items win';
eventDescriptions[3].hp = 5;
eventDescriptions[3].will = 5;
eventDescriptions[3].check = 5;

//var emojicodes = ['<:LABfow:746192126215454760>', 'error1', 'error2', 'error3', 'error4', 'error5', 'error6', 'error7', 'error8', '<:LAB9:746192126282563594>', '<:LAB10:746192126018322444>', '<:LAB11:746192126139957278>',
 //'<:LAB12:746192125934305331>', '<:LAB13:746192125984505868>', '<:LAB14:746192126160797806>', '<:LAB15:746192126261592064>', '<:LABenter:746192125917659137>', '<:LABexit:746192126114529301>']; //the house

 var emojicodes = ['<:LABfow:741876829148938261>', 'error1', 'error2', 'error3', 'error4', 'error5', 'error6', 'error7', 'error8', '<:LAB9:741876828612067399>', '<:LAB10:741876828716793873>', '<:LAB11:741876829153132584>',
 '<:LAB12:741876829173841990>', '<:LAB13:741876829031497747>', '<:LAB14:741876829044080660>', '<:LAB15:741876829060857987>', '<:LABenter:744657747626426401>', '<:LABexit:744657795281977464>']; //my server

//this is the hidden bot token. 
client.login(token);