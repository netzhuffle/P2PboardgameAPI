/** Error if the connection was not started */
export default class ConnectionNotStartedError extends Error {
  /**
   * Instantiates the error
   * @param {string} message - The error message
   */
  constructor(message = 'Connection was not started') {
    super(message);
    /**
     * The error message
     * @type {string}
     */
    this.message = message;
    /**
     * The error name
     * @type {string}
     */
    this.name = 'ConnectionNotStartedError';
  }
}
