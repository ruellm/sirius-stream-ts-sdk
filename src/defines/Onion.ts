
// handshake constants
export const NodeIdentityKeySize = 1024;

// MaxVariableRelayDataLength defines maximum length for the Stream Relay Cell content
export const MaxVariableRelayDataLength = 65535;

export const HandshakeProtoID = "psp-curve25519-sha256-01"
export const HandshakeVerify  = HandshakeProtoID + ":verify"
export const HandshakeAuthSuffix = ":server";
export const HandshakeMac = HandshakeProtoID + ":mac";
export const HandshakeKey = HandshakeProtoID + ":key_extract";
export const HandshakeExpand     = HandshakeProtoID + ":key_expand";

export const HashSize = 20;
export const StreamCipherKeySize = 16;
