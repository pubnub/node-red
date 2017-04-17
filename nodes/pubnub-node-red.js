var PubNub = require('pubnub');
var Mustache = require('mustache');

module.exports = function (RED) {
  // This is a config node holding the keys for connecting to PubNub
  function PubnubKeysNode(n) {
    RED.nodes.createNode(this, n);

    this.publish_key = n.pub_key;
    this.subscribe_key = n.sub_key;
  }

  RED.nodes.registerType('pubnub-keys', PubnubKeysNode);

  //
  // Establish a new connection
  // (assign to pn_obj variable)
  //
  function initializePubNub(node) {
    node.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
    var keys = node.keysConfig;
    if (keys) {
      node.log('Connecting to PubNub ' + keys.publish_key + ':' + keys.subscribe_key);
      node.pn_obj = new PubNub({
        publishKey: keys.publish_key,
        subscribeKey: keys.subscribe_key,
        cipherKey: node.cipherKey,
        authKey: node.authKey,
        ssl: node.ssl,
        logVerbosity: this.verboseLogging
      });

      node.pn_obj.addListener({
        message: function (m) {
          node.log('Message event arrived: ' + JSON.stringify(m, null, '\t'));
          node.send({ channel: m.channel, payload: m.message });
        },
        presence: function (p) {
          node.log('Presence event arrived: ' + JSON.stringify(p, null, '\t'));
        },
        status: function (s) {
          if (s.category === 'PNConnectedCategory') {
            node.status({ fill: 'green', shape: 'dot', text: 'listening' });
          }

          node.log('Status event arrived: ' + JSON.stringify(s, null, '\t'));
        }
      });

      node.status({ fill: 'yellow', shape: 'dot', text: 'connected' });
    } else {
      node.error('Unknown publish and subscribe keys!');
      node.status({ text: '' });
    }
  }

  //
  // The Input Node
  //
  function PNInNode(n) {
    RED.nodes.createNode(this, n);
    this.channel = n.channel;
    this.keys = n.keys;
    this.authKey = n.auth_token;
    this.cipherKey = n.cipher_key;
    this.ssl = n.ssl;
    this.verboseLogging = n.verbose_logging;
    this.keysConfig = RED.nodes.getNode(this.keys);

    // Establish a new connection
    if (this.pn_obj == null) {
      initializePubNub(this);
    }

    // Subscribe to a channel
    if (this.pn_obj != null) {
      if (this.channel) {
        this.log('Subscribing to channel ' + this.channel);
        this.pn_obj.subscribe({ channels: this.channel.split(',') });
      } else {
        this.warn('Unknown channel name!');
        this.status({ fill: 'green', shape: 'ring', text: 'channel?' });
      }
    }

    // Destroy on node close event
    var node = this;
    this.on('close', function () {
      if (node.pn_obj != null && node.channel) {
        node.log('Unsubscribing from channel ' + node.channel);
        node.pn_obj.unsubscribe({ channels: [node.channel.split(',')] });
      }
      node.pn_obj = null;
    });
  }
  RED.nodes.registerType('pubnub in', PNInNode);


  //
  // The Output Node
  //
  function PNOutNode(n) {
    RED.nodes.createNode(this, n);
    this.channel = n.channel;
    this.keys = n.keys;
    this.authKey = n.auth_token;
    this.cipherKey = n.cipher_key;
    this.ssl = n.ssl;
    this.verboseLogging = n.verbose_logging;
    this.keysConfig = RED.nodes.getNode(this.keys);

    var node;

    // Establish a new connection
    if (this.pn_obj == null) {
      initializePubNub(this);
    }

    // Publish to a channel
    if (this.pn_obj != null) {
      if (this.channel) {
        node = this;
        this.on('input', function (msg) {
	node.channel = Mustache.render(node.channel, msg.payload);
          this.log('Publishing to channel ' + node.channel);

	
 	  node.pn_obj.publish({ channel: node.channel, message: msg.payload }, function (status, response) {
            if (status.error) {
              node.log('Failure sending message ' + msg.payload + ' ' + JSON.stringify(status, null, '\t') + 'Please retry publish!');
            } else {
              node.log('Success sending message ' + msg.payload + ' ' + JSON.stringify(response, null, '\t'));
            }
          });
        });
        this.status({ fill: 'green', shape: 'dot', text: 'published' });
      } else {
        this.warn('Unknown channel name!');
        this.status({ fill: 'green', shape: 'ring', text: 'channel?' });
      }
    }

    // Destroy on node close event
    node = this;
    this.on('close', function () {
      node.pn_obj = null;
    });
  }

  RED.nodes.registerType('pubnub out', PNOutNode);
};
