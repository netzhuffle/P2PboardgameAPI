import Channel from '../src/Channel';

/** @test {Channel} */
describe('Channel', function () {
  let channel;
  beforeEach(function () {
    channel = new Channel({
      channels: { 1: {}, 2: {}, 3: {} },
    }, {
      instance: () => {},
    });
  });

  describe('#getNumberOfUsers()', function () {
    /** @test {Channel#getNumberOfUsers} */
    it('returns the number of users', function () {
      return expect(channel.getNumberOfUsers()).to.become(4);
    });
  });

  describe('#getUserID()', function () {
    /** @test {Channel#getUserID} */
    it('returns the user ID', function () {
      const userID = 'user id';
      channel.dataChannel.userid = userID;
      return expect(channel.getUserID()).to.equal(userID);
    });
  });

  describe('#getOtherUserIDs()', function () {
    /** @test {Channel#getOtherUserIDs} */
    it('returns the other users’ IDs', function () {
      return expect(channel.getOtherUserIDs()).to.become(['1', '2', '3']);
    });
  });

  describe('#send()', function () {
    /** @test {Channel#send} */
    it('sends the message over the DataChannel', function () {
      channel.dataChannel.send = sinon.spy();
      const message = 'message';
      channel.send(message);
      expect(channel.dataChannel.send).to.have.been.calledWith(message);
    });
  });

  describe('#sendPrivately()', function () {
    /** @test {Channel#sendPrivately} */
    it('sends the message over the DataChannel to the right user', function () {
      const userID = '2';
      const notUserID = '1';
      channel.dataChannel.channels[userID].send = sinon.spy();
      channel.dataChannel.channels[notUserID].send = sinon.spy();
      channel.dataChannel.send = sinon.spy();
      const message = 'private message';
      channel.sendPrivately(userID, message);
      expect(channel.dataChannel.channels[userID].send).to.have.been.calledWith(message);
      expect(channel.dataChannel.channels[notUserID].send).to.not.have.been.called();
      expect(channel.dataChannel.send).to.not.have.been.called();
    });
  });
});
