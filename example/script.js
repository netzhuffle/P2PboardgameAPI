'use strict';

const game = window.p2pboardgameapi('../src/signaling.php');
const statusElement = document.getElementById('status');
const tableElement = document.getElementById('table');

/* Add game elements */

function animateDie(element) {
  if (this.isRolling) {
    element.textContent = Math.floor(Math.random() * 5) + 1;
    setTimeout(() => {
      requestAnimationFrame(animateDie.bind(this, element));
    }, 10);
  }
}

function createDie(id) {
  const die = game.createDie(id);
  const element = document.getElementById(id);
  element.addEventListener('click', die.roll.bind(die), false);
  die.on.error.add(error => alert(error));
  die.on.rollStart.add(() => {});
  die.on.rollStart.add(animateDie.bind(die, element));
  die.on.rollFinish.add((number) => {
    element.textContent = number;
  });
}

createDie('die1');
createDie('die2');
createDie('die3');
createDie('die4');

function createDeck(id) {
  const faces = [
    '♣A',
    '♣K',
    '♣Q',
    '♣J',
    '♣10',
    '♣9',
    '♣8',
    '♣7',
    '♣6',
    '♣5',
    '♣4',
    '♣3',
    '♣2',
    '♦A',
    '♦K',
    '♦Q',
    '♦J',
    '♦10',
    '♦9',
    '♦8',
    '♦7',
    '♦6',
    '♦5',
    '♦4',
    '♦3',
    '♦2',
    '♥A',
    '♥K',
    '♥Q',
    '♥J',
    '♥10',
    '♥9',
    '♥8',
    '♥7',
    '♥6',
    '♥5',
    '♥4',
    '♥3',
    '♥2',
    '♠A',
    '♠K',
    '♠Q',
    '♠J',
    '♠10',
    '♠9',
    '♠8',
    '♠7',
    '♠6',
    '♠5',
    '♠4',
    '♠3',
    '♠2',
  ];
  const deck = game.createDeck(faces);
  const element = document.getElementById(id);
  deck.on.error.add(error => alert(error));
  deck.on.drawn.add((cardID, playerNumber) => {
    delete element.dataset.hiddenCard;
    element.textContent = `hidden card from player ${playerNumber}`;
  });
  deck.on.secretlyKnownFace.add((cardID, face) => {
    element.dataset.hiddenCard = cardID;
    element.textContent = `${face} (hidden) – click to reveal publicly`;
  });
  deck.on.publicKnownFace.add((cardID, face) => {
    delete element.dataset.hiddenCard;
    element.textContent = `${face} – click to draw another card`;
  });
  element.addEventListener('click', function () {
    if (!this.dataset.hiddenCard) {
      deck.drawCard();
    } else {
      deck.flipCard(this.dataset.hiddenCard);
    }
  }, false);
}

createDeck('deck1');
createDeck('deck2');
createDeck('deck3');
createDeck('deck4');

/* Handle connections and game start */

statusElement.textContent = 'Starting connection …';
game.startConnection();
if (game.playerNumber === 0) {
  const url = game.getURL();
  statusElement.textContent = `Connection opened as host. Please share the following URL: ${url}`;
  const connectedElement = document.createElement('div');
  connectedElement.textContent = '0 players connected';
  statusElement.appendChild(connectedElement);
  const update = () => {
    game.getNumberOfPlayers().then((numberOfPlayers) => {
      const playerCount = numberOfPlayers - 1;
      connectedElement.textContent = `${playerCount} player(s) connected with you.`;
      if (playerCount) {
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.addEventListener('click', game.start.bind(game));
        connectedElement.appendChild(startButton);
      }
    });
  };
  game.on.playerJoin.add(update);
  game.on.playerLeave.add(update);
} else {
  const update = () => {
    game.getNumberOfPlayers().then((numberOfPlayers) => {
      const playerCount = numberOfPlayers - 1;
      statusElement.textContent = `Connected with ${playerCount} player(s). Waiting for start …`;
    });
  };
  game.on.playerJoin.add(update);
  game.on.playerLeave.add(update);
}
game.on.start.add(() => {
  statusElement.setAttribute('hidden', 'hidden');
  tableElement.removeAttribute('hidden');
});

/* Ease debugging */
game.channel.on.message.add((message, userID) =>
  console.log('received message from', userID, ': ', message));
