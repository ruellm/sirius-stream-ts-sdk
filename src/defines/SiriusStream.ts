
export const StreamNamespaceId = Object.freeze({
    AuthProtocolNamespace      : 1,
    DiscoveryProtocolNamespace : 2,
    DHTProtocolNamespace       : 3,
    OnionPresenceProtocol      : 4,
    MediaStreamingProtocol     : 5,
});

export const DiscoveryRequestProtocolNum = "psp-discovery-1.0";

// MaxApplicationMessageSize defines the maximum allowed length
export const MaxApplicationMessageSize = 2 * 1024 * 1024; //65535 - 2

// MaxPayloadLength defines maximum fixed cell size.
const MaxPayloadLength = 509;

// MaxRelayDataLength defines maximum length for Relay Cell payload content
export const MaxRelayDataLength = MaxPayloadLength - 9;

// MaxVariableRelayDataLength defines maximum length for the Stream Relay Cell content
export const MaxVariableRelayDataLength = 65535;


// ApplicationMessageSizeType defines the size type for application message length field
export type ApplicationMessageSizeType = number;

// NumberOfAuthSignaturesRequiredBy defines how many signatures a client or node is required for a valid certificate
export const NumberOfAuthSignaturesRequiredByClient        = 3