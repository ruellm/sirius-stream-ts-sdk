
import { AsnParser } from "@peculiar/asn1-schema";
import { Certificate } from "@peculiar/asn1-x509";
import * as c from "crypto"
import * as forge from "node-forge";

export function fingerprintCertificateDER( raw: Buffer, bitValidation : number) : Buffer {
    const data = new forge.util.ByteStringBuffer(raw);
    let asn1 = forge.asn1.fromDer(data);
    let cert = forge.pki.certificateFromAsn1(asn1);

    if( cert == null)
        return null;

    // @ts-ignore
    if (bitValidation != 0 && cert.publicKey.n.bitLength() < bitValidation) {
        console.log("wrong RSA key size");
        return null;
    }

    //<--
    // TODO: lacking check of signature, to follow implementation when we have
    // a reliable new TLS library for nodejs/typescript
    //-->

    const crt = AsnParser.parse(raw, Certificate);
    let byteBuffer = new Uint8Array(crt.tbsCertificate.subjectPublicKeyInfo.subjectPublicKey);

    return c.createHash('sha256').update(byteBuffer).digest();
}
