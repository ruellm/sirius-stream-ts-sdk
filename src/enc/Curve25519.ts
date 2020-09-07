export class Curve25519KeyPair {
    public PrivateKey : Buffer;
    public PublicKey : Buffer;
    constructor(privKey? : Buffer, pubKey? : Buffer) {
        this.PrivateKey = (privKey == undefined)? null : privKey;
        this.PublicKey = (pubKey == undefined)? null : pubKey;
    }
}