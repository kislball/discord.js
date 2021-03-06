'use strict';

const Base = require('./Base');
const IntegrationApplication = require('./IntegrationApplication');

/**
 * The information account for an integration
 * @typedef {Object} IntegrationAccount
 * @property {string} id The id of the account
 * @property {string} name The name of the account
 */

/**
 *  Represents a server integration.
 */
class Integration extends Base {
  constructor(client, data, server) {
    super(client);

    /**
     * The server this integration belongs to
     * @type {Server}
     */
    this.server = server;

    /**
     * The integration id
     * @type {Snowflake}
     */
    this.id = data.id;

    /**
     * The integration name
     * @type {string}
     */
    this.name = data.name;

    /**
     * The integration type (twitch, youtube, etc)
     * @type {string}
     */
    this.type = data.type;

    /**
     * Whether this integration is enabled
     * @type {boolean}
     */
    this.enabled = data.enabled;

    /**
     * Whether this integration is syncing
     * @type {boolean}
     */
    this.syncing = data.syncing;

    /**
     * The role that this integration uses for subscribers
     * @type {Role}
     */
    this.role = this.server.roles.cache.get(data.role_id);

    if (data.user) {
      /**
       * The user for this integration
       * @type {?User}
       */
      this.user = this.client.users.add(data.user);
    } else {
      this.user = null;
    }

    /**
     * The account integration information
     * @type {IntegrationAccount}
     */
    this.account = data.account;

    /**
     * The last time this integration was last synced
     * @type {number}
     */
    this.syncedAt = data.synced_at;
    this._patch(data);
  }

  /**
   * All roles that are managed by this integration
   * @type {Collection<Snowflake, Role>}
   * @readonly
   */
  get roles() {
    const roles = this.server.roles.cache;
    return roles.filter(role => role.tags && role.tags.integrationID === this.id);
  }

  _patch(data) {
    /**
     * The behavior of expiring subscribers
     * @type {number}
     */
    this.expireBehavior = data.expire_behavior;

    /**
     * The grace period before expiring subscribers
     * @type {number}
     */
    this.expireGracePeriod = data.expire_grace_period;

    if ('application' in data) {
      if (this.application) {
        this.application._patch(data.application);
      } else {
        /**
         * The application for this integration
         * @type {?IntegrationApplication}
         */
        this.application = new IntegrationApplication(this.client, data.application);
      }
    } else if (!this.application) {
      this.application = null;
    }
  }

  /**
   * Sync this integration
   * @returns {Promise<Integration>}
   */
  sync() {
    this.syncing = true;
    return this.client.api
      .servers(this.server.id)
      .integrations(this.id)
      .post()
      .then(() => {
        this.syncing = false;
        this.syncedAt = Date.now();
        return this;
      });
  }

  /**
   * The data for editing an integration.
   * @typedef {Object} IntegrationEditData
   * @property {number} [expireBehavior] The new behaviour of expiring subscribers
   * @property {number} [expireGracePeriod] The new grace period before expiring subscribers
   */

  /**
   * Edits this integration.
   * @param {IntegrationEditData} data The data to edit this integration with
   * @param {string} reason Reason for editing this integration
   * @returns {Promise<Integration>}
   */
  edit(data, reason) {
    if ('expireBehavior' in data) {
      data.expire_behavior = data.expireBehavior;
      data.expireBehavior = null;
    }
    if ('expireGracePeriod' in data) {
      data.expire_grace_period = data.expireGracePeriod;
      data.expireGracePeriod = null;
    }
    // The option enable_emoticons is only available for Twitch at this moment
    return this.client.api
      .servers(this.server.id)
      .integrations(this.id)
      .patch({ data, reason })
      .then(() => {
        this._patch(data);
        return this;
      });
  }

  /**
   * Deletes this integration.
   * @returns {Promise<Integration>}
   * @param {string} [reason] Reason for deleting this integration
   */
  delete(reason) {
    return this.client.api
      .servers(this.server.id)
      .integrations(this.id)
      .delete({ reason })
      .then(() => this);
  }

  toJSON() {
    return super.toJSON({
      role: 'roleID',
      server: 'serverID',
      user: 'userID',
    });
  }
}

module.exports = Integration;
