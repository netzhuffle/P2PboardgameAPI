import NoErrorListenerError from './NoErrorListenerError';

/**
 * A six sided die
 */
export default class Die {
  /**
   * Instantiates a new Die object
   * @protected
   * @param {string} id - The die’s ID (has to be unique per game)
   * @param {DieFace[]} dieFaces - The die’s faces
   * @param {Game} game - The game where this Die belongs to
   * @param {SignalFactory} signalFactory - Instance factory for event signals
   */
  constructor(id, dieFaces, game, signalFactory) {
    /**
     * The die’s ID
     * (unique per game)
     * @protected
     * @type {string}
     */
    this.id = id;
    /**
     * The die's faces
     * @type {DieFace[]}
     */
    this.dieFaces = dieFaces;
    /**
     * The Game where this Deck belongs to
     * @private
     * @type {Game}
     */
    this.game = game;
    /**
     * Event container
     * @type {Object<string, Signal>}
     * @property {Signal} error - Event signal for asynchronous errors (Parameters: error)
     * @property {Signal} rollStart - Event signal when the die starts rolling (No parameters)
     * @property {Signal} rollFinish - Event signal when the die finishes rolling (Parameters: face)
     */
    this.on = {
      error: signalFactory.instance(),
      rollStart: signalFactory.instance(),
      rollFinish: signalFactory.instance(),
    };
    /**
     * If the die is currently rolling
     * @type {boolean}
     */
    this.isRolling = false;
  }

  /**
   * Rolls the die to determine a random die face
   * @emits {error} when an connection error occured or the result could not be decrypted
   */
  roll() {
    if (!this.on.error.getNumListeners()) {
      throw new NoErrorListenerError();
    }

    if (this.isRolling) {
      return;
    }

    this.isRolling = true;
    this.on.rollStart.dispatch();
    const deck = this.game.createInternalDeck(this.dieFaces);
    this.game.channel.send({
      type: 'die/rollstart',
      dieID: this.id,
      deckID: deck.id,
    });
    deck.on.error.add(e => this.on.error.dispatch(e));
    deck.on.secretlyKnownFace.addOnce(cardID => deck.flipCard(cardID));
    deck.on.secretlyKnownFace.addOnce((cardID, face) => this.rolled(face));
    deck.on.shuffleFinish.add(() => {
      deck.drawCard();
    });
    deck.shuffle();
  }

  /**
   * Handles a rollstart message from another player
   * @protected
   * @param {Object} message - The message
   * @emits {error} when an connection error occured
   */
  handleMessage(message) {
    this.isRolling = true;
    this.on.rollStart.dispatch();
    const deck = this.game.createInternalDeck(this.dieFaces, message.deckID);
    deck.on.error.add(e => this.on.error.dispatch(e));
    deck.on.publicKnownFace.addOnce((cardID, face) => this.rolled(face));
    deck.shuffle();
  }

  /**
   * Emits rollFinish event with the rolled side
   * @private
   * @param {DieFace} face - The rolled die face
   * @emits {rollFinish} that the die has been rolled
   */
  rolled(face) {
    this.isRolling = false;
    this.on.rollFinish.dispatch(face);
  }
}
