const players = {};

const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-example',
  width: 1400,
  height: 720,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  autoFocus: false
};

function preload() {
  //loads the images
  this.load.image('first', 'assets/nike.png');
  this.load.image('apple', 'assets/snakefood.png');
}

function create() {
  const self = this;
  this.players = this.physics.add.group();

  this.scores = {
    blue: 0,
    red: 0
  };

  this.apple = this.physics.add.image(rando(700), rando(500), 'apple');
  this.physics.add.collider(this.players);
  //if apple and player overlap then increase the score of the team that it is
  this.physics.add.overlap(this.players, this.apple, function (apple, player) {
    if (players[player.playerId].team === 'red') {
      self.scores.red += 10;
    } else {
      self.scores.blue += 10;
    }
    self.apple.setPosition(rando(700), rando(500));
    io.emit('updateScore', self.scores);
    io.emit('appleLocation', { x: self.apple.x, y: self.apple.y });
  });

  io.on('connection', function (socket) {
    console.log('a user connected');
    // create a new player and add it to our players object
    players[socket.id] = {
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      playerId: socket.id,
      team: (Math.floor(Math.random() * 2) == 0) ? 'red ' : 'blue',
      input: {
        left: false,
        right: false,
        up: false,
        down: false
      }
    };
    //Adding the player to server
    addPlayer(self, players[socket.id]);

    //Checking the current players
    socket.emit('currentPlayers', players);

    //New player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    //Sending the location of the apple
    socket.emit('appleLocation', { x: self.apple.x, y: self.apple.y });

    //Updating in the case the scores change
    socket.emit('updateScore', self.scores);

    //Player disconnects from the server
    socket.on('disconnect', function () {
      console.log('user disconnected');

      //remove them
      removePlayer(self, socket.id);

      //Deleting the player from the object
      delete players[socket.id];

      //Emit disconnect message
      io.emit('disconnect', socket.id);
    });

    //Updates the players if the inputs are used
    socket.on('playerInput', function (inputData) {
      handlePlayerInput(self, socket.id, inputData);
    });
  });

}

function update() {
  this.players.getChildren().forEach((player) => {
    const input = players[player.playerId].input;
    if (input.left) {
      player.x = player.x - 4;
    } else if (input.right) {
      player.x = player.x + 4;
    } else if (input.up) {
      player.y = player.y - 4;
    } else if (input.down) {
      player.y = player.y + 4;
    }
    // else if (input.left && input.down) {
    //   player.x = player.x - 2;
    //   player.y = player.y + 2;
    // } else if (input.right && input.down) {
    //   player.x = player.x + 2;
    //   player.y = player.y + 2;
    // } else if (input.right && input.right) {
    //   player.x = player.x + 2;
    //   player.y = player.y - 2;
    // } else if (input.left && input.down) {
    //   player.x = player.x - 2;
    //   player.y = player.y - 2;
    // }


    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;
  });

  this.physics.world.wrap(this.players, 5);

  io.emit('playerUpdates', players);
}


function rando(max) {
  return Math.floor(Math.random() * max) + 50;
}

function handlePlayerInput(self, playerId, input) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      players[player.playerId].input = input;
    }
  });
}

//add function
function addPlayer(self, playerInfo) {
  const player = self.physics.add.image(playerInfo.x, playerInfo.y, 'first').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  player.playerId = playerInfo.playerId;
  self.players.add(player);
}

//remove function
function removePlayer(self, playerId) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      player.destroy();
    }
  });
}

const game = new Phaser.Game(config);
window.gameLoaded();
