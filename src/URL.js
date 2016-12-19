/**
 * URL helper
 * @protected
 */
export default class URL {
  /**
   * If the current URL has a hash
   * @protected
   * @returns {boolean}
   */
  hasHash() {
    return !!location.hash;
  }

  /**
   * Gets the URL's hash
   * @protected
   * @returns {string} The hash (without the # sign)
   */
  getHash() {
    return location.hash.substr(1);
  }

  /**
   * Sets the URL's hash
   * @protected
   * @param {string} hash - The hash (without the # sign)
   */
  setHash(hash) {
    location.hash = `#${hash}`;
  }

  /**
   * Gets the full current URL
   * @protected
   * @returns {string} The URL
   */
  getURL() {
    return location.href;
  }
}
