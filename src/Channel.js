/**
 * A P2P communication channel
 * @protected
 */
export default class Channel {
  /**
   * Instantiates a new Channel object
   * @protected
   * @param {DataChannel} dataChannel - The DataChannel to operate on
   * @param {SignalFactory} signalFactory - Instance factory for event signals
   */
  constructor(dataChannel, signalFactory) {
    /**
     * The DataChannel to operate on
     * @private
     * @type {DataChannel}
     */
    this.dataChannel = dataChannel;
    /**
     * Event container
     * @type {Object<string, Signal>}
     * @property {Signal} userJoin - Signal for userJoin event
     * @property {Signal} userLeave - Signal for userLeave event
     * @property {Signal} message - Signal for message event
     */
    this.on = {
      userJoin: signalFactory.instance(),
      userLeave: signalFactory.instance(),
      message: signalFactory.instance(),
    };
    this.registerDataChannelEvents();
  }

  /**
   * Gets the channel ID
   * @protected
   * @return {string} The channel ID
   */
  getID() {
    return this.dataChannel.channel;
  }

  /**
   * Gets the user’s unique ID
   * @protected
   * @return {string} The user’s ID
   */
  getUserID() {
    return this.dataChannel.userid;
  }

  /**
   * Gets the number of currently connected users
   * @protected
   * @return {Promise<number>} Currently connected users including the active user
   */
  getNumberOfUsers() {
    // needs to be done asynchronous because DataChannel updates number only after the listeners
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(1 + Object.keys(this.dataChannel.channels).length);
      }, 1);
    });
  }

  /**
   * Gets the other users’ unique IDs
   * @protected
   * @return {Promise<Array<string>>} The other users’ IDs
   */
  getOtherUserIDs() {
    // needs to be done asynchronous because DataChannel updates number only after the listeners
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Object.keys(this.dataChannel.channels));
      }, 1);
    });
  }

  /**
   * Registers events on the DataChannel
   * @private
   * @emits {userJoin} when a new user joined the channel
   * @emits {userLeave} when a user left the channel
   * @emits {message} when a message was received over  the channel
   */
  registerDataChannelEvents() {
    this.dataChannel.onopen = (userID) => this.on.userJoin.dispatch(userID);
    this.dataChannel.onleave = (userID) => this.on.userLeave.dispatch(userID);
    this.dataChannel.onclose = () => {};
    this.dataChannel.onmessage = (message, userID) => this.on.message.dispatch(message, userID);
  }

  /**
   * Sends data over the DataChannel
   * @protected
   * @param {Object|string} data - The data
   */
  send(data) {
    this.dataChannel.send(data);
  }

  /**
   * Sends data over the DataChannel to a specific user only
   * @protected
   * @param {string} userID - The receiver’s user ID
   * @param {Object|string} data - The data
   */
  sendPrivately(userID, data) {
    this.dataChannel.channels[userID].send(data);
  }
}
