import ConnectionNotStartedError from './ConnectionNotStartedError';

/** A game session */
export default class Game {
  /**
   * Instantiates a new Game object
   * @protected
   * @param {string} signalingUrl - The relative or absolute URL of the signaling.php file
   * @param {ConnectionFactory} connectionFactory - Instance factory for connections
   * @param {URL} url - The URL helper
   * @param {DeckFactory} deckFactory - Instance factory for decks
   * @param {DieFactory} dieFactory - Instance factory for dice
   * @param {PieceFactory} pieceFactory - Instance factory for pieces
   * @param {SignalFactory} signalFactory - Instance factory for event signals
   */
  constructor(signalingUrl, connectionFactory, url, deckFactory, dieFactory, pieceFactory,
              signalFactory) {
    /**
     * The connection instance
     * @private
     * @type {Connection}
     */
    this.connection = connectionFactory.instance(signalingUrl);
    /**
     * The URL helper
     * @private
     * @type {URL}
     */
    this.url = url;
    /**
     * Instance factory for decks
     * @private
     * @type {DeckFactory}
     */
    this.deckFactory = deckFactory;
    /**
     * Instance factory for dice
     * @private
     * @type {DieFactory}
     */
    this.dieFactory = dieFactory;
    /**
     * Instance factory for pieces
     * @private
     * @type {PieceFactory}
     */
    this.pieceFactory = pieceFactory;
    /**
     * Event container
     * @type {Object<string, Signal>}
     * @property {Signal} playerJoin - Event signal when a player joins the game (Parameter: userID)
     * @property {Signal} playerLeave - Event signal when a player leaves the game (Parameter: userID)
     * @property {Signal} start - Event signal when the game starts (No parameters)
     */
    this.on = {
      playerJoin: signalFactory.instance(),
      playerLeave: signalFactory.instance(),
      start: signalFactory.instance(),
    };
    this.on.start.memorize = true;
    /**
     * This game’s card decks
     * including internal card decks
     * @private
     * @type {Array<Deck>}
     */
    this.decks = [];
    /**
     * This game’s dice
     * @private
     * @type {Map<string, Die>}
     */
    this.dice = new Map();
    /**
     * This game’s movable pieces
     * @private
     * @type {Map<string, Piece>}
     */
    this.pieces = new Map();
  }

  /**
   * Starts the P2P connection
   */
  startConnection() {
    if (this.url.hasHash()) {
      /**
       * The communication channel
       * @protected
       * @type {Channel}
       */
      this.channel = this.connection.connect(this.url.getHash());
    } else {
      /**
       * The player number
       * (starting at 0 for the host)
       * @type {boolean}
       */
      this.playerNumber = 0;
      this.channel = this.connection.open();
      this.url.setHash(this.channel.getID());
    }
    this.registerEvents();
  }

  /**
   * Get the game URL which other users can use to connect
   * @returns {string} The URL
   * @throws {ConnectionNotStartedError} when startConnection() was not called before
   */
  getURL() {
    if (!this.channel) {
      throw new ConnectionNotStartedError();
    }

    return this.url.getURL();
  }

  /**
   * Gets the number of currently connected players
   * @return {Promise<number, ConnectionNotStartedError>} Currently connected players
   */
  getNumberOfPlayers() {
    if (!this.channel) {
      return Promise.reject(new ConnectionNotStartedError());
    }

    return this.channel.getNumberOfUsers();
  }

  /**
   * Registers event listeners
   * @private
   * @emits {playerJoin} when a new player joined the game
   * @emits {playerLeave} when a player left the game
   */
  registerEvents() {
    this.channel.on.userJoin.add((userID) => {
      this.on.playerJoin.dispatch(userID);
    });
    this.channel.on.userLeave.add((userID) => {
      this.on.playerLeave.dispatch(userID);
    });
    this.channel.on.message.add((message, senderID) => {
      this.handleMessage(message, senderID);
    });
  }

  /**
   * Starts the game for all players
   * @emits {start} the game starts
   * @throws {ConnectionNotStartedError} when startConnection() was not called before
   */
  start() {
    if (!this.channel) {
      throw new ConnectionNotStartedError();
    }

    const userID = this.channel.getUserID();
    this.channel.getOtherUserIDs().then((userIDs) => {
      /**
       * The players’ unique user IDs
       * @type {Array<number>}
       */
      this.players = [userID, ...userIDs];
      this.channel.send({
        type: 'start',
        userIDs: this.players,
      });
    });
    this.on.start.dispatch();
  }

  /**
   * Handles new message from the channel
   * @private
   * @param {Object} message - The message
   * @param {string} senderID - The sender’s userID
   * @emits {start} when the game starts
   */
  handleMessage(message, senderID) {
    if (message.type === 'start') {
      this.players = message.userIDs;
      const userID = this.channel.getUserID();
      this.playerNumber = message.userIDs.findIndex(playerUserID => userID === playerUserID);
      this.on.start.dispatch();
    } else if (message.type.startsWith('deck/')) {
      this.decks[message.deckID].handleMessage(message, senderID);
    } else if (message.type.startsWith('die/')) {
      this.dice.get(message.dieID).handleMessage(message, senderID);
    } else if (message.type.startsWith('piece/')) {
      this.pieces.get(message.pieceID).handleMessage(message, senderID);
    }
  }

  /**
   * Creates and shuffles a new deck for the game
   * @param {CardFace[]} cardFaces - The deck’s card faces (max. 52)
   * @returns {Deck} The newly created deck
   * @throws {RangeError} when cardFaces has under 2 or over 52 elements
   */
  createDeck(cardFaces) {
    if (!cardFaces || cardFaces.length < 2) {
      throw new RangeError('cardFaces must have at least 2 elements');
    }
    if (cardFaces.length > 52) {
      throw new RangeError('cardFaces must have at most 52 elements');
    }

    const deck = this.createInternalDeck(cardFaces);
    this.on.start.add(deck.shuffle, deck);

    return deck;
  }

  /**
   * Creates a new internal deck with a given id for the game
   * @protected
   * @param {CardFace[]} cardFaces - The decks card faces (max. 52)
   * @param {number} [id] - The decks ID
   * @returns {Deck} The newly created deck
   */
  createInternalDeck(cardFaces, id = this.decks.length) {
    const deck = this.deckFactory.instance(id, cardFaces, this);
    this.decks[id] = deck;

    return deck;
  }

  /**
   * Creates a new die for the game
   * @param {string} id - The die’s id
   * @param {number|DieFace[]} [dieFaces=6] - The die’s faces, numbered from 1 to n or custom faces
   * @returns {Die} The newly created die
   * @throws {RangeError} when dieFaces has under 2 or over 52 elements
   */
  createDie(id, dieFaces = 6) {
    if (dieFaces.length && dieFaces.length < 2 || dieFaces < 2) {
      throw new RangeError('cardFaces must have at least 2 elements');
    }
    if (dieFaces.length && dieFaces.length > 52 || dieFaces > 52) {
      throw new RangeError('cardFaces must have at most 52 elements');
    }

    let dieFaceArray = dieFaces;
    if (!Array.isArray(dieFaces)) {
      dieFaceArray = new Array(dieFaces).fill(undefined).map((value, index) => index + 1);
    }
    const die = this.dieFactory.instance(id, dieFaceArray, this);
    this.dice.set(id, die);

    return die;
  }

  /**
   * Creates a movable piece for the game
   * @param {string} id - The piece’s id
   * @returns {Piece} The newly created piece
   */
  createPiece(id) {
    const piece = this.pieceFactory.instance(id, this);
    this.pieces.set(id, piece);

    return piece;
  }
}
