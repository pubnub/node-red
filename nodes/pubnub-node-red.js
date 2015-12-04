module.exports = function(RED) {
    "use strict";
    var PN = require("pubnub");

    // This is a config node holding the keys for connecting to PubNub
    function PubnubKeysNode(n) {
        RED.nodes.createNode(this,n);
    }
    RED.nodes.registerType("pubnub-keys",PubnubKeysNode,{
        credentials: {
            publish_key: { type:"text" },
            subscribe_key: { type:"text" },
            auth_key: { type:"password" },
            cipher_key: { type:"password" },
            ssl: { type:"bool" },
            uuid : { type:"text" }
        }
    });


    //
    // The Input Node
    //
    function PNInNode(n) {
        RED.nodes.createNode(this,n);
        this.channel = n.channel;
        this.keys = n.keys;


        this.keysConfig = RED.nodes.getNode(this.keys);

        // Establish a new connection
        if (this.pn_obj == null)
            PNInit(this);

        // Subscribe to a channel
        if (this.pn_obj != null) {
            if (this.channel) {
                this.log("Subscribing to channel (" + this.channel + ")");
                var node = this;
                this.pn_obj.subscribe({
                    channel  : this.channel,
                    callback : function(message, env, channel) {
                        node.log("Received message on channel " + channel + ", payload is " + message);
                        node.send({channel: channel, payload: message});
                    }
                });
                this.status({fill:"green",shape:"dot",text:"listening"});
            }
            else {
                this.warn("Unknown channel name!");
                this.status({fill:"green",shape:"ring",text:"channel?"});
            }
        }

        // Destroy on node close event
        var node = this;
        this.on('close', function() {
          if (node.pn_obj != null && node.channel) {
            node.log("Unsubscribing from channel " + node.channel);
            node.pn_obj.unsubscribe({
              channel: node.channel
            });
          }
          node.pn_obj = null;
        });
    }
    RED.nodes.registerType("pubnub in",PNInNode);


    //
    // The Output Node
    //
    function PNOutNode(n) {
        RED.nodes.createNode(this,n);
        this.channel = n.channel;
        this.keys = n.keys;
        this.keysConfig = RED.nodes.getNode(this.keys);

        // Establish a new connection
        if (this.pn_obj == null)
            PNInit(this);

        // Publish to a channel
        if (this.pn_obj != null) {
            if (this.channel) {
                var node = this;
                this.on("input", function(msg) {
                    this.log("Publishing to channel (" + node.channel + ")");
                    node.pn_obj.publish({
                        channel : node.channel,
                        message : msg.payload,
                        callback : function(e) {
                            node.log("Success sending message " + msg.payload +
                                "(" + e + ")");
                        },
                        error : function(e) {
                            node.log("Failure sending message " + msg.payload +
                                "(" + e + "). Please retry publish!");
                        }
                    });
                });
                this.status({fill:"green",shape:"dot",text:"published"});
            }
            else {
                this.warn("Unknown channel name!");
                this.status({fill:"green",shape:"ring",text:"channel?"});
            }
        }

        // Destroy on node close event
        var node = this;
        this.on('close', function() {
          node.pn_obj = null;
        });
    }
    RED.nodes.registerType("pubnub out",PNOutNode);


    //
    // Establish a new connection
    // (assign to pn_obj variable)
    //
    function PNInit(node) {
        node.status({fill:"red",shape:"ring",text:"disconnected"});
        var keys = node.keysConfig.credentials;
        if (keys) {
            node.log("Connecting to PubNub (" +
                keys.publish_key + ":" + keys.subscribe_key+")");
            node.pn_obj = PN({
                publish_key : keys.publish_key,
                subscribe_key : keys.subscribe_key,
                auth_key : keys.auth_key,
                cipher_key : keys.cipher_key,
                ssl : keys.ssl,
                uuid : keys.uuid
            });
            node.status({fill:"yellow",shape:"dot",text:"connected"});
        }
        else {
            node.error("Unknown publish and subscribe keys!");
            node.status({text:""});
        }
    }
}
