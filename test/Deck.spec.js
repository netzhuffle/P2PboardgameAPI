import Deck from '../src/Deck';
import NoErrorListenerError from '../src/NoErrorListenerError';

/** @test {Deck} */
describe('Deck', function () {
  let deck;
  const deckID = 42;
  const playerJSON = 'player not-really-JSON';
  const playerDetails = {
    generatePoints: sinon.spy(),
    generateSecrets: sinon.spy(),
    toJSON: () => playerJSON,
    points: [{
      x: 1,
      y: 2,
    }],
  };
  let cypherPokerGame;
  let card1;
  let game;
  beforeEach(function () {
    game = {
      getNumberOfPlayers: sinon.stub().returns(Promise.reject()),
      players: ['a', 'b', 'c', 'd', 'e'],
      channel: {
        send: sinon.spy(),
        sendPrivately: sinon.spy(),
      },
    };
    cypherPokerGame = {
      generateInitialDeck: sinon.spy(),
      shuffleDeck: sinon.stub().returns({ toJSON: () => true }),
      deckSequence: [null],
      unpickableCardIndexes: [],
    };
    card1 = 'card1';
    deck = new Deck(deckID, ['card0', card1, 'card2', 'card3'], game, {
      instance: () => cypherPokerGame,
    }, {
      instance: () => (playerDetails),
    }, {
      instance: () => ({ points: [] }),
    }, {
      instance: x => x,
    }, {
      instance: x => x,
    }, {
      instance: () => ({
        dispatch: sinon.spy(),
      }),
    });
    deck.on.error.getNumListeners = sinon.stub().returns(1);
  });

  describe('#constructor()', function () {
    /** @test {Deck#constructor} */
    it('sets the Deck ID', function () {
      expect(deck.id).to.equal(deckID);
    });
  });

  describe('#shuffle()', function () {
    /** @test {Deck#shuffle} */
    it('throws a NoErrorListenerError if no error listener', function () {
      deck.on.error.getNumListeners = sinon.stub().returns(0);
      expect(deck.shuffle.bind(deck)).to.throw(NoErrorListenerError);
    });

    /** @test {Deck#shuffle} */
    it('creates the own mental poker player', function () {
      const playerNumber = 2;
      deck.game.playerNumber = playerNumber;
      deck.shuffle();
      expect(deck.playerDetails[playerNumber]).to.be.ok();
    });

    /** @test {Deck#shuffle} */
    it('creates the own mental poker player', function () {
      const playerNumber = 2;
      deck.game.playerNumber = playerNumber;
      deck.shuffle();
      const player = deck.playerDetails[playerNumber];
      expect(player.generatePoints).to.have.been.called();
      expect(player.generateSecrets).to.have.been.called();
    });

    /** @test {Deck#shuffle} */
    it('sends player details to other players', function () {
      const playerNumber = 2;
      deck.game.playerNumber = playerNumber;
      deck.shuffle();
      expect(game.channel.send).to.have.been.calledWith({
        type: 'deck/playerdetails',
        deckID,
        playerNumber,
        playerDetails: playerJSON,
      });
    });
  });

  describe('#drawCard()', function () {
    /** @test {Deck#drawCard} */
    it('throws a NoErrorListenerError if no error listener', function () {
      deck.on.error.getNumListeners = sinon.stub().returns(0);
      expect(deck.drawCard.bind(deck)).to.throw(NoErrorListenerError);
    });

    /** @test {Deck#drawCard} */
    it('asks other players for card keys', function () {
      const cardID = 19;
      const playerNumber = 0;
      deck.cypherPokerGame = {
        getRandomPickableCardIndex: sinon.stub().returns(cardID),
      };
      deck.game.playerNumber = playerNumber;
      deck.playerDetails[playerNumber] = {
        secrets: {
          [cardID]: 10,
        },
      };
      deck.drawCard();
      expect(game.channel.send).to.have.been.calledWith({
        type: 'deck/draw',
        deckID,
        cardID,
      });
    });
  });

  describe('#handleMessage()', function () {
    /** @test {Deck#handleMessage} */
    it('sets the player details on playerdetails message', function () {
      const playerNumber = 0;
      const playerData = 'player data';
      const message = {
        type: 'deck/playerdetails',
        deckID,
        playerNumber,
        playerData,
      };
      deck.handleMessage(message);
      expect(deck.playerDetails[playerNumber]).to.deep.equal(playerDetails);
    });

    /** @test {Deck#handleMessage} */
    it('adds, shuffles, and sends to next player on shuffled message if next player', function () {
      deck.cypherPokerGame = cypherPokerGame;
      deck.cypherPokerGame.addDeckToSequence = sinon.spy();
      deck.game.playerNumber = 3;
      const deckData = { points: [] };
      const message = {
        type: 'deck/shuffled',
        deckID,
        deck: deckData,
        nextPlayer: 3,
      };
      deck.handleMessage(message);
      expect(deck.cypherPokerGame.addDeckToSequence).to.have.been.calledWith(deckData);
      expect(deck.cypherPokerGame.shuffleDeck).to.have.been.called();
      expect(game.channel.send).to.have.been.calledWith(sinon.match({
        type: 'deck/shuffled',
        deckID,
        nextPlayer: 4,
        deck: sinon.match.object,
      }));
    });

    /** @test {Deck#handleMessage} */
    it('add, do not shuffle or send on shuffled message if not next player', function () {
      deck.cypherPokerGame = cypherPokerGame;
      deck.cypherPokerGame.addDeckToSequence = sinon.spy();
      deck.game.playerNumber = 3;
      const deckData = { points: [] };
      const message = {
        type: 'deck/shuffled',
        deckID,
        deck: deckData,
        nextPlayer: '2',
      };
      deck.handleMessage(message);
      expect(deck.cypherPokerGame.addDeckToSequence).to.have.been.calledWith(deckData);
      expect(deck.cypherPokerGame.shuffleDeck).to.not.have.been.called();
      expect(game.channel.send).to.not.have.been.called();
    });

    /** @test {Deck#handleMessage} */
    it('shuffles and sends to first player on shuffled message if last player', function () {
      deck.cypherPokerGame = cypherPokerGame;
      deck.cypherPokerGame.addDeckToSequence = sinon.spy();
      game.playerNumber = 4;
      const deckData = { points: [] };
      const message = {
        type: 'deck/shuffled',
        deckID,
        deck: deckData,
        nextPlayer: 4,
      };
      deck.handleMessage(message);
      expect(deck.cypherPokerGame.addDeckToSequence).to.have.been.calledWith(deckData);
      expect(deck.cypherPokerGame.shuffleDeck).to.have.been.called();
      expect(game.channel.send).to.have.been.calledWith(sinon.match({
        type: 'deck/shuffled',
        deckID,
        nextPlayer: 0,
        deck: sinon.match.object,
      }));
    });

    /** @test {Deck#handleMessage} */
    it('add, lock deck, and send to player 1 on shuffled message if player 0', function () {
      deck.cypherPokerGame = cypherPokerGame;
      deck.cypherPokerGame.addDeckToSequence = sinon.spy();
      deck.cypherPokerGame.lockDeck = sinon.stub().returns({ toJSON: () => true });
      game.playerNumber = 0;
      const deckData = { points: [] };
      const message = {
        type: 'deck/shuffled',
        deckID,
        deck: deckData,
        nextPlayer: 0,
      };
      deck.handleMessage(message);
      expect(deck.cypherPokerGame.addDeckToSequence).to.have.been.calledWith(deckData);
      expect(deck.cypherPokerGame.lockDeck).to.have.been.called();
      expect(game.channel.send).to.have.been.calledWith(sinon.match({
        type: 'deck/locked',
        deckID,
        nextPlayer: 1,
        deck: sinon.match.object,
      }));
    });

    /** @test {Deck#handleMessage} */
    it('add, lock deck, and send to next player on locked message if next player', function () {
      deck.cypherPokerGame = cypherPokerGame;
      deck.cypherPokerGame.addDeckToSequence = sinon.spy();
      deck.cypherPokerGame.lockDeck = sinon.stub().returns({ toJSON: () => true });
      game.playerNumber = 3;
      const deckData = { points: [] };
      const message = {
        type: 'deck/locked',
        deckID,
        deck: deckData,
        nextPlayer: 3,
      };
      deck.handleMessage(message);
      expect(deck.cypherPokerGame.addDeckToSequence).to.have.been.calledWith(deckData);
      expect(deck.cypherPokerGame.lockDeck).to.have.been.called();
      expect(game.channel.send).to.have.been.calledWith(sinon.match({
        type: 'deck/locked',
        deckID,
        nextPlayer: 4,
        deck: sinon.match.object,
      }));
    });

    /** @test {Deck#handleMessage} */
    it('add, do not lock or send deck on locked message if not next player', function () {
      deck.cypherPokerGame = cypherPokerGame;
      deck.cypherPokerGame.addDeckToSequence = sinon.spy();
      deck.cypherPokerGame.lockDeck = sinon.spy();
      game.playerNumber = 3;
      const deckData = { points: [] };
      const message = {
        type: 'deck/locked',
        deckID,
        deck: deckData,
        nextPlayer: 2,
      };
      deck.handleMessage(message);
      expect(deck.cypherPokerGame.addDeckToSequence).to.have.been.calledWith(deckData);
      expect(deck.cypherPokerGame.lockDeck).to.have.not.been.called();
      expect(game.channel.send).to.have.not.been.called();
    });

    /** @test {Deck#handleMessage} */
    it('add, lock, and send and emit shuffleFinish on locked message if next player', function () {
      deck.cypherPokerGame = cypherPokerGame;
      deck.cypherPokerGame.addDeckToSequence = sinon.spy();
      deck.cypherPokerGame.lockDeck = sinon.stub().returns({ toJSON: () => true });
      game.playerNumber = 4;
      const deckData = { points: [] };
      const message = {
        type: 'deck/locked',
        deckID,
        deck: deckData,
        nextPlayer: 4,
      };
      deck.handleMessage(message);
      expect(deck.cypherPokerGame.addDeckToSequence).to.have.been.calledWith(deckData);
      expect(deck.cypherPokerGame.lockDeck).to.have.been.called();
      expect(game.channel.send).to.have.been.calledWith(sinon.match({
        type: 'deck/locked',
        deckID,
        deck: sinon.match.defined,
        nextPlayer: sinon.match.typeOf('undefined'),
      }));
      expect(deck.on.shuffleFinish.dispatch).to.have.been.called();
    });

    /** @test {Deck#handleMessage} */
    it('emits shuffleFinish event on locked message if there is no next player', function () {
      deck.cypherPokerGame = cypherPokerGame;
      deck.cypherPokerGame.addDeckToSequence = sinon.spy();
      deck.cypherPokerGame.lockDeck = sinon.spy();
      game.playerNumber = 3;
      const deckData = { points: [] };
      const message = {
        type: 'deck/locked',
        deckID,
        deck: deckData,
      };
      deck.handleMessage(message);
      expect(deck.on.shuffleFinish.dispatch).to.have.been.called();
    });

    /** @test {Deck#handleMessage} */
    it('sends player the card secret on draw message', function () {
      const otherPlayerID = 'pid';
      const cardID = 13;
      const playerNumber = 3;
      const secretString = 'the secret';
      const secret = {
        toString: sinon.mock().returns(secretString),
      };
      const ownPlayerDetails = {
        secrets: [],
      };
      ownPlayerDetails.secrets[cardID] = secret;
      game.playerNumber = playerNumber;
      deck.cypherPokerGame = cypherPokerGame;
      deck.playerDetails[playerNumber] = ownPlayerDetails;
      deck.handleMessage({
        type: 'deck/draw',
        deckID,
        cardID,
      }, otherPlayerID);
      expect(ownPlayerDetails.secrets[cardID].toString).to.have.been.calledWith(16, 2);
      expect(game.channel.sendPrivately).to.have.been.calledWith(otherPlayerID, {
        type: 'deck/cardsecret',
        deckID,
        cardID,
        playerNumber,
        secret: secretString,
      });
    });

    /** @test {Deck#handleMessage} */
    it('adds the secret to the right player on cardsecret message', function () {
      const cardID = 12;
      const playerNumber = 1;
      const secret = 'her secret';
      deck.playerDetails = [];
      deck.playerDetails[playerNumber] = {
        addSecret: sinon.spy(),
      };
      sinon.stub(deck, 'checkAllCardSecrets');
      deck.handleMessage({
        type: 'deck/cardsecret',
        deckID: this.id,
        cardID,
        playerNumber,
        secret,
      });
      expect(deck.playerDetails[playerNumber].addSecret).to.have.been.calledWith(cardID, secret);
      expect(deck.checkAllCardSecrets).to.have.been.called();
    });
  });

  describe('#checkAllPlayerDetails()', function () {
    /** @test {Deck#checkAllPlayerDetails} */
    it('does not set the CypherPokerGame if not received all player details', function () {
      deck.playerDetails[0] = true;
      deck.checkAllPlayerDetails(2);
      expect(deck.cypherPokerGame).to.not.be.ok();
    });

    /** @test {Deck#checkAllPlayerDetails} */
    it('does set the CypherPokerGame if received all player details', function () {
      deck.playerDetails[0] = true;
      deck.playerDetails[1] = true;
      deck.checkAllPlayerDetails(2);
      expect(deck.cypherPokerGame).to.be.ok();
    });

    /** @test {Deck#checkAllPlayerDetails} */
    it('does not generate deck if not player 0', function () {
      deck.playerDetails[0] = true;
      deck.playerDetails[1] = true;
      deck.checkAllPlayerDetails(2);
      expect(deck.cypherPokerGame.generateInitialDeck).to.not.have.been.called();
    });

    /** @test {Deck#checkAllPlayerDetails} */
    it('generates and shuffles deck if received all and player number is 0', function () {
      game.playerNumber = 0;
      deck.playerDetails[0] = true;
      deck.playerDetails[1] = true;
      deck.checkAllPlayerDetails(2);
      expect(deck.cypherPokerGame.generateInitialDeck).to.have.been.called();
      expect(deck.cypherPokerGame.shuffleDeck).to.have.been.called();
    });

    /** @test {Deck#checkAllPlayerDetails} */
    it('sends the game to player 1 if received all and player number is 0', function () {
      game.playerNumber = 0;
      deck.playerDetails[0] = true;
      deck.playerDetails[1] = true;
      deck.checkAllPlayerDetails(2);
      expect(game.channel.send).to.have.been.calledWith(sinon.match({
        type: 'deck/shuffled',
        deckID,
        nextPlayer: 1,
        deck: sinon.match.object,
      }));
    });
  });

  describe('#checkAllCardSecrets()', function () {
    /** @test {Deck#checkAllCardSecrets} */
    it('emits event if all player secrets are known', function () {
      deck.cypherPokerGame = {
        drawCard: sinon.stub().returns({
          id: 5,
        }),
      };
      deck.playerDetails = [{ secrets: [true] }];
      const cardID = 0;
      deck.checkAllCardSecrets(cardID);
      expect(deck.on.publicKnownFace.dispatch).to.have.been.calledWith(cardID, card1);
    });
  });
});
