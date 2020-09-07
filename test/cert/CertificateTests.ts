import {buildIdentity, IdentityType} from "../../src/pki/Identity";
import {newFlatCertificate} from "../../src/cert/FlatCertificate";
import {certificateLifetime} from "../../src/defines/Certificate";
import {Ed25519KeyPair, SignedEd25519KeyPair} from "../../src/cert/KeyPair";
import {stringToAsciiByteArray} from "../../src/utils/Hex";
import {newSignedMessage} from "../../src/cert/Mesage";
import {marshal} from "../../src/utils/ProtoMapping";
import {protocol} from "../../proto/out/auth";
import AuthRequestCertificate = protocol.AuthRequestCertificate;
import {ApplicationMessageProcessor} from "../../src/routing/ApplicationMessage";
import {newCircuitCryptoState} from "../../src/routing/circuit/CircuitCrypto";
import {expect} from "chai";

describe('Certificate test', () => {

    it('should generate renew certificate', () => {
        // simulate Authenticate renew certificate routine
        var mpk = [
            241, 231, 89, 255, 9, 196, 164, 205, 196, 134, 131, 184, 135, 113, 21, 3, 143, 78, 19, 103, 36, 183, 143, 35, 201, 14, 246, 203, 78, 195, 166, 46, ];
        var pk = [
            221, 36, 185, 209, 164, 175, 228, 44, 237, 212, 148, 174, 249, 139, 92, 16, 83, 211, 175, 78, 255, 207, 133, 188, 149, 242, 156, 88, 236, 128, 53, 80, ];
        var privateKey = [
            91, 150, 9, 187, 39, 52, 34, 161, 70, 80, 216, 61, 74, 31, 117, 65, 88, 151, 16, 95, 59, 181, 38, 255, 221, 244, 13, 111, 157, 197, 130, 250, 241, 231, 89, 255, 9, 196, 164, 205, 196, 134, 131, 184, 135, 113, 21, 3, 143, 78, 19, 103, 36, 183, 143, 35, 201, 14, 246, 203, 78, 195, 166, 46, ];
        var signPrivateKey = [
            233, 165, 4, 203, 34, 208, 20, 156, 192, 146, 83, 65, 225, 113, 132, 1, 123, 49, 3, 21, 158, 58, 250, 97, 16, 161, 90, 40, 202, 113, 72, 252, 221, 36, 185, 209, 164, 175, 228, 44, 237, 212, 148, 174, 249, 139, 92, 16, 83, 211, 175, 78, 255, 207, 133, 188, 149, 242, 156, 88, 236, 128, 53, 80, ];

        let pkiIdentity = buildIdentity("peerstream", "client", IdentityType.Account, Buffer.from(mpk));

        let stub = newFlatCertificate(Buffer.from(pk), pkiIdentity, certificateLifetime, Buffer.from(privateKey));
        let kp = new SignedEd25519KeyPair(
            new Ed25519KeyPair(Buffer.from(pk), Buffer.from(signPrivateKey)),
            stub);

        let msgb = Buffer.from(stringToAsciiByteArray("psp-auth-1.0"));
        let sm = newSignedMessage(msgb, kp);

        let authMsg = new AuthRequestCertificate();
        authMsg.certificateStub = sm.marshal();

        let msg = marshal(authMsg);

        let processor = new ApplicationMessageProcessor();
        let msgs = processor.buildSRelayOutput(msg);

    })

});
