import Die from '../src/Die';
import NoErrorListenerError from '../src/NoErrorListenerError';

/** @test {Die} */
describe('Die', function () {
  const dieID = 'die';
  const deckID = 5;
  let die;
  let game;
  let deck;
  beforeEach(function () {
    deck = {
      id: deckID,
      on: {
        shuffleFinish: { add: sinon.spy() },
        error: { add: () => {} },
        secretlyKnownFace: { addOnce: sinon.spy() },
        publicKnownFace: { addOnce: sinon.spy() },
      },
      shuffle() {},
    };
    game = {
      decks: [],
      createInternalDeck: () => deck,
      channel: {
        send: sinon.spy(),
      },
    };
    die = new Die(dieID, [1, 2, 3, 4, 5, 6], game, {
      instance: () => ({
        dispatch() {},
      }),
    });
    die.on.error.getNumListeners = sinon.stub().returns(1);
  });

  describe('#roll()', function () {
    /** @test {Die#roll} */
    it('throws a NoErrorListenerError if no error listener', function () {
      die.on.error.getNumListeners = sinon.stub().returns(0);
      expect(die.roll.bind(die)).to.throw(NoErrorListenerError);
    });

    /** @test {Die#roll} */
    it('sends rollstart message and registers events', function () {
      die.roll();
      expect(game.channel.send).to.have.been.calledWith({
        type: 'die/rollstart',
        dieID,
        deckID,
      });
      expect(deck.on.shuffleFinish.add).to.have.been.called();
    });
  });

  describe('#handleMessage()', function () {
    /** @test {Die#handleMessage} */
    it('registers publicKnownFace event', function () {
      game.decks[deckID] = deck;
      const message = {
        type: 'die/rollstart',
        dieID,
        deckID,
      };
      die.handleMessage(message);
      expect(deck.on.publicKnownFace.addOnce).to.have.been.called();
    });
  });
});
