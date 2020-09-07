import * as curve from "../src/3rd-party/curve25519-js";

describe('Curve25519 test', () => {
    it('can generate keys', () => {
        const ALICE_PRIV = '77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a';
        const BOB_PUB = 'de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f';

        const alicePriv = Uint8Array.from(Buffer.from(ALICE_PRIV, 'hex'));

        const bobPub = Uint8Array.from(Buffer.from(BOB_PUB, 'hex'));

        const secret = curve.sharedKey(alicePriv, bobPub);

        console.log('Secret:', Buffer.from(secret).toString('hex'))
    })
});