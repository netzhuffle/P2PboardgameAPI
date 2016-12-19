import NoErrorListenerError from './NoErrorListenerError';
import DecryptionError from './DecryptionError';

/**
 * A deck of cards
 */
export default class Deck {
  /**
   * Instantiates a new Deck object
   * @protected
   * @param {number} id - The deck’s ID (has to be unique per game)
   * @param {CardFace[]} cardFaces - The deck’s card faces (max. 52)
   * @param {Game} game - The game where this Deck belongs to
   * @param {CypherPokerGameFactory} cypherPokerGameFactory - Instance factory for CypherPoker Games
   * @param {CypherPokerPlayerFactory} playerFactory - Instance factory for CypherPoker Players
   * @param {CypherPokerDeckFactory} cypherPokerDeckFactory - Instance factory for CypherPoker Decks
   * @param {EllipticPointFactory} ellipticPointFactory - Instance factory for EllipticPoints
   * @param {BigNumFactory} bigNumFactory - Instance factory for BigNums
   * @param {SignalFactory} signalFactory - Instance factory for event signals
   */
  constructor(id, cardFaces, game, cypherPokerGameFactory, playerFactory, cypherPokerDeckFactory,
              ellipticPointFactory, bigNumFactory, signalFactory) {
    /**
     * The deck’s ID
     * (unique per game)
     * @protected
     * @type {number}
     */
    this.id = id;
    /**
     * The deck’s card faces
     * @type {CardFace[]}
     */
    this.cardFaces = cardFaces;
    /**
     * The Game where this Deck belongs to
     * @private
     * @type {Game}
     */
    this.game = game;
    /**
     * The CypherPoker Game factory
     * @private
     * @type {CypherPokerGameFactory}
     */
    this.cypherPokerGameFactory = cypherPokerGameFactory;
    /**
     * The CypherPoker Player factory
     * @private
     * @type {CypherPokerPlayerFactory}
     */
    this.cypherPokerPlayerFactory = playerFactory;
    /**
     * The CypherPoker Deck factory
     * @private
     * @type {CypherPokerDeckFactory}
     */
    this.cypherPokerDeckFactory = cypherPokerDeckFactory;
    /**
     * The EllipticPoint factory
     * @private
     * @type {EllipticPointFactory}
     */
    this.ellipticPointFactory = ellipticPointFactory;
    /**
     * The BigNum factory
     * @private
     * @type {BigNumFactory}
     */
    this.bigNumFactory = bigNumFactory;
    /**
     * The players public and secret informations about the deck
     * @private
     * @type {CypherPokerPlayer[]}
     */
    this.playerDetails = [];
    /**
     * The known faces (key = cardID, value = face)
     * @private
     * @type {Map<number, CardFace>}
     */
    this.knownFaces = new Map();
    /**
     * The self drawn cards
     * @type {number[]}
     */
    this.ownCards = [];
    /**
     * Event container
     * @type {Object<string, Signal>}
     * @property {Signal} error - Event signal for asynchronous errors (Parameters: error)
     * @property {Signal} shuffleFinish - Event signal when deck finished shuffling (No parameters)
     * @property {Signal} drawn - Event signal when a card was drawn by a client (Parameters: cardID, playerNumber)
     * @property {Signal} secretlyKnownFace - Event signal when this client knows a hidden card face (Parameters: cardID, face)
     * @property {Signal} publicKnownFace - Event signal when all clients know a card face (Parameters: cardID, face)
     */
    this.on = {
      error: signalFactory.instance(),
      shuffleFinish: signalFactory.instance(),
      drawn: signalFactory.instance(),
      secretlyKnownFace: signalFactory.instance(),
      publicKnownFace: signalFactory.instance(),
    };
  }

  /**
   * Draws a random card
   * @param {number} [cardID] - The card’s ID to draw
   * @emits {drawn} that the card has been drawn
   */
  drawCard(cardID = this.cypherPokerGame.getRandomPickableCardIndex()) {
    if (!this.on.error.getNumListeners()) {
      throw new NoErrorListenerError();
    }

    const playerNumber = this.game.playerNumber;
    this.game.channel.send({
      type: 'deck/draw',
      deckID: this.id,
      cardID,
    });
    this.ownCards.push(cardID);
    this.on.drawn.dispatch(cardID, playerNumber);
  }

  /**
   * Announces a card face to the other players
   * @param {number} cardID - The card’s ID to flip
   */
  flipCard(cardID) {
    this.game.channel.send({
      type: 'deck/cardflip',
      deckID: this.id,
      cardID,
    });
    const playerDetails = this.playerDetails[this.game.playerNumber];
    const secret = playerDetails.secrets[cardID].toString(16, 2);
    this.game.channel.send({
      type: 'deck/cardsecret',
      deckID: this.id,
      cardID,
      playerNumber: this.game.playerNumber,
      secret,
    });
    this.on.publicKnownFace.dispatch(cardID, this.knownFaces.get(cardID));
  }

  /**
   * Shuffles the deck together with the other players
   * @protected
   */
  shuffle() {
    if (!this.on.error.getNumListeners()) {
      throw new NoErrorListenerError();
    }

    const playerDetails = this.cypherPokerPlayerFactory.instance();
    playerDetails.generatePoints();
    playerDetails.generateSecrets();
    this.playerDetails[this.game.playerNumber] = playerDetails;
    this.game.channel.send({
      type: 'deck/playerdetails',
      deckID: this.id,
      playerNumber: this.game.playerNumber,
      playerDetails: playerDetails.toJSON(),
    });
  }

  /**
   * Handles a message from another player
   * @protected
   * @param {Object} message - The message
   * @param {string} senderID - The sender’s userID
   */
  handleMessage(message, senderID) {
    const handlers = {
      'deck/playerdetails': this.handlePlayerDetailsMessage,
      'deck/initial': this.handleInitialMessage,
      'deck/shuffled': this.handleShuffledMessage,
      'deck/locked': this.handleLockedMessage,
      'deck/draw': this.handleDrawMessage,
      'deck/cardsecret': this.handleCardSecretMessage,
      'deck/cardflip': this.handleCardFlipMessage,
    };
    handlers[message.type].call(this, message, senderID);
  }

  /**
   * Handles a message of type 'deck/playerdetails'
   * @private
   * @param {Object} message - The message
   * @param {string} message.type - The message type (expected to be 'deck/playerdetails')
   * @param {number} message.deckID - The deck ID (expected to be this objects deck ID)
   * @param {number} message.playerNumber - The player’s number
   * @param {Object} message.playerDetails - The player’s details
   */
  handlePlayerDetailsMessage(message) {
    if (!this.playerDetails[this.game.playerNumber]) {
      setTimeout(this.handlePlayerDetailsMessage.bind(this, message), 100);
      return;
    }

    const player = this.cypherPokerPlayerFactory.instance(message.playerDetails);
    this.playerDetails[message.playerNumber] = player;
    player.points = player.points.map(point =>
      this.ellipticPointFactory.instance(point.x, point.y));
    this.game.getNumberOfPlayers().then(this.checkAllPlayerDetails.bind(this));
  }

  /**
   * Handles a message of type 'deck/initial'
   * @private
   * @param {Object} message - The message
   * @param {string} message.type - The message type (expected to be 'deck/initial')
   * @param {number} message.deckID - The deck ID (expected to be this objects deck ID)
   * @param {Object} message.deck - The new deck’s data
   */
  handleInitialMessage(message) {
    if (!this.cypherPokerGame) {
      setTimeout(this.handleInitialMessage.bind(this, message), 100);
      return;
    }

    this.saveDeck(message.deck);
  }

  /**
   * Handles a message of type 'deck/shuffled'
   * @private
   * @param {Object} message - The message
   * @param {string} message.type - The message type (expected to be 'deck/shuffled')
   * @param {number} message.deckID - The deck ID (expected to be this objects deck ID)
   * @param {Object} message.deck - The shuffled deck data
   * @param {number} message.nextPlayer - The player who has to shuffle or lock next
   */
  handleShuffledMessage(message) {
    if (!this.cypherPokerGame || !this.cypherPokerGame.deckSequence.length) {
      setTimeout(this.handleShuffledMessage.bind(this, message), 100);
      return;
    }

    this.saveDeck(message.deck);
    if (message.nextPlayer === this.game.playerNumber) {
      if (this.game.playerNumber > 0) {
        this.doMentalPokerShuffle();
      } else {
        this.doMentalPokerLock();
      }
    }
  }

  /**
   * Handles a message of type 'deck/locked'
   * @private
   * @param {Object} message - The message
   * @param {string} message.type - The message type (expected to be 'deck/locked')
   * @param {number} message.deckID - The deck ID (expected to be this objects deck ID)
   * @param {Object} message.deck - The locked deck data
   * @param {number} message.nextPlayer - The player who has to lock next
   * @emits {shuffleFinish} when the deck finished shuffling
   */
  handleLockedMessage(message) {
    this.saveDeck(message.deck);
    if (message.nextPlayer === this.game.playerNumber) {
      this.doMentalPokerLock();
    } else if (!('nextPlayer' in message)) {
      this.on.shuffleFinish.dispatch();
    }
  }

  /**
   * Handles a message of type 'deck/draw'
   * @private
   * @param {Object} message - The message
   * @param {string} message.type - The message type (expected to be 'deck/draw')
   * @param {number} message.deckID - The deck ID (expected to be this objects deck ID)
   * @param {number} message.cardID - The drawn card’s ID
   * @param {string} userID - The drawing user’s ID
   * @emits {drawn} that the card has been drawn
   */
  handleDrawMessage(message, userID) {
    const playerDetails = this.playerDetails[this.game.playerNumber];
    const cardID = message.cardID;
    this.cypherPokerGame.unpickableCardIndexes.push(cardID);
    const secret = playerDetails.secrets[message.cardID].toString(16, 2);
    this.game.channel.sendPrivately(userID, {
      type: 'deck/cardsecret',
      deckID: this.id,
      cardID,
      playerNumber: this.game.playerNumber,
      secret,
    });
    const playerNumber = this.game.players.findIndex(id => userID === id);
    this.on.drawn.dispatch(cardID, playerNumber);
  }

  /**
   * Handles a message of type 'deck/cardsecret'
   * @private
   * @param {Object} message - The message
   * @param {string} message.type - The message type (expected to be 'deck/cardsecret')
   * @param {number} message.deckID - The deck ID (expected to be this objects deck ID)
   * @param {number} message.cardID - The drawn card’s ID
   * @param {number} message.playerNumber - The sender’s player number
   * @param {string} message.secret - The player’s secret for the card
   */
  handleCardSecretMessage(message) {
    const secret = this.bigNumFactory.instance(message.secret);
    this.playerDetails[message.playerNumber].addSecret(message.cardID, secret);
    this.checkAllCardSecrets(message.cardID);
  }

  /**
   * Handles a message of type 'deck/cardflip'
   * @private
   * @param {Object} message - The message
   * @param {string} message.type - The message type (expected to be 'deck/cardflip')
   * @param {number} message.deckID - The deck ID (expected to be this objects deck ID)
   * @param {number} message.cardID - The flipped card’s ID
   */
  handleCardFlipMessage(message) {
    const playerDetails = this.playerDetails[this.game.playerNumber];
    const cardID = message.cardID;
    const secret = playerDetails.secrets[message.cardID].toString(16, 2);
    this.game.channel.send({
      type: 'deck/cardsecret',
      deckID: this.id,
      cardID,
      playerNumber: this.game.playerNumber,
      secret,
    });
  }

  /**
   * Stores a received deck
   * @private
   * @param {Object} deck - The deck
   * @param {Array<{x: string, y: string}>} deck.points - The deck points
   */
  saveDeck(deck) {
    const points = deck.points.map(point =>
      this.ellipticPointFactory.instance(point.x, point.y));
    const cypherPokerDeck = this.cypherPokerDeckFactory.instance(points);
    this.cypherPokerGame.state = 2; // state seems buggy and forbids adding deck in wrong state
    this.cypherPokerGame.addDeckToSequence(cypherPokerDeck);
  }

  /**
   * Shuffles the mental poker Game’s deck
   * and notifies the other players
   * @private
   */
  doMentalPokerShuffle() {
    const deck = this.cypherPokerGame.shuffleDeck();
    const nextPlayer = (this.game.playerNumber + 1) % this.game.players.length;
    this.game.channel.send({
      type: 'deck/shuffled',
      deckID: this.id,
      deck,
      nextPlayer,
    });
  }

  /**
   * Locks the mental poker Game’s deck
   * and notifies the other players
   * @private
   */
  doMentalPokerLock() {
    const deck = this.cypherPokerGame.lockDeck();
    const lockMessage = {
      type: 'deck/locked',
      deckID: this.id,
      deck,
    };
    if (this.game.playerNumber < this.game.players.length - 1) {
      lockMessage.nextPlayer = (this.game.playerNumber + 1) % this.game.players.length;
    } else {
      this.on.shuffleFinish.dispatch();
    }
    this.game.channel.send(lockMessage);
  }

  /**
   * Checks if collected all player details and continues with shuffling if so
   * @private
   * @param {number} totalPlayerCount - Total number of players in the game
   */
  checkAllPlayerDetails(totalPlayerCount) {
    if (this.playerDetails.length !== totalPlayerCount) {
      return;
    }

    /**
     * The deck’s CypherPokerGame object
     * @private
     * @type {CypherPokerGame}
     */
    this.cypherPokerGame = this.cypherPokerGameFactory.instance(this.playerDetails);

    if (this.game.playerNumber === 0) {
      this.cypherPokerGame.generateInitialDeck();
      this.game.channel.send({
        type: 'deck/initial',
        deckID: this.id,
        deck: this.cypherPokerGame.deckSequence[0],
      });
      /**
       * Whether the initial deck was sent to the other players
       * @private
       * @type {boolean}
       */
      this.sentInitialDeck = true;
      this.doMentalPokerShuffle();
    }
  }

  /**
   * Checks if collected all player's card secrets and picks the card if so
   * @private
   * @param {number} cardID - The card’s ID
   * @emits {secretlyKnownFace} when the own card’s face is known
   * @emits {error} when a card could not be decrypted (DecryptionError)
   */
  checkAllCardSecrets(cardID) {
    if (this.knownFaces.has(cardID) ||
      !this.playerDetails.every(player => player.secrets[cardID])) {
      return;
    }

    this.cypherPokerGame.unpickableCardIndexes = this.cypherPokerGame.unpickableCardIndexes.filter(
    id => id !== cardID); // need to make card drawable again
    const maximumCard = 51 - (52 % this.cardFaces.length);
    const cypherPokerCard = this.cypherPokerGame.drawCard(cardID);
    if (!cypherPokerCard.id) {
      this.error.dispatch(new DecryptionError());
      return;
    }
    if (cypherPokerCard.id > maximumCard) {
      this.drawCard();
      return;
    }

    const faceID = cypherPokerCard.id % this.cardFaces.length;
    const face = this.cardFaces[faceID];
    this.knownFaces.set(cardID, face);
    if (this.ownCards.some(card => card === cardID)) {
      this.on.secretlyKnownFace.dispatch(cardID, face);
    } else {
      this.on.publicKnownFace.dispatch(cardID, face);
    }
  }
}
