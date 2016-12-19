/** Error if a timeout occured */
export default class TimeoutError extends Error {
  /**
   * Instantiates the error
   * @param {string} message - The error message
   */
  constructor(message = 'A client did could not be reached or did not reply in time') {
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
    this.name = 'TimeoutError';
  }
}
