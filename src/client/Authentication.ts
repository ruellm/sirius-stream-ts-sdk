import {NodePublicIdentity} from "./Discovery";
import {ExtractNodes, ExtractRandomNodesWithType, RandomFromNodeType} from "../utils/NodeExtractor";
import * as names from "../defines/Names";
import {CircuitBuilder} from "../routing/circuit/CircuitBuilder";
import * as forge from "node-forge";
import {addSignature, newFlatCertificate} from "../cert/FlatCertificate";
import {certificateLifetime} from "../defines/Certificate";
import {Ed25519KeyPair, SignedEd25519KeyPair} from "../cert/KeyPair";
import {newSignedMessage} from "../cert/Mesage";
import {stringToAsciiByteArray} from "../utils/Hex";
import {AuthRequestCertificateResultMessage, marshal} from "../utils/ProtoMapping";
import {protocol} from "../../proto/out/auth";
import AuthRequestCertificate = protocol.AuthRequestCertificate;
import {Log} from "../utils/Logger";
import {Circuit} from "../routing/circuit/Circuit";
import {buildIdentity, IdentityType} from "../pki/Identity";
import * as auth from "../../proto/out/auth";

export type OnRegistrationComplete = (SignedEd25519KeyPair) => void;

export class Authentication {
    private nodes : Array<NodePublicIdentity>;

    private CachedCertificate : SignedEd25519KeyPair;
    private onRegistrationComplete : Array<OnRegistrationComplete>;
    private circuitCache : Circuit;
    private circuitBuilder : CircuitBuilder;

    constructor() {

        this.onRegistrationComplete = new Array<OnRegistrationComplete>();
        this.CachedCertificate = null;
    }

    set Nodes (nodes : Array<NodePublicIdentity>) {
        this.nodes = nodes;
    }

    registerUser() {
        var context = this;

        // build 3 nodes with authority at the endpoint
        let endPoint : NodePublicIdentity;
        let redo = false;
        do {
            redo = false;
            endPoint = RandomFromNodeType(this.nodes, names.TypeAuthorityNode);
            if (this.CachedCertificate != null) {
                for (let i = 0; i < this.CachedCertificate.Certificate.Signatures.length; i++) {
                    if (this.CachedCertificate.Certificate.Signatures[i].Certificate.PKIAccountID.Id == endPoint.Identity) {
                        redo = true;
                        break;
                    }
                }
            }

        } while(redo);

        let nodes = ExtractRandomNodesWithType(this.nodes, names.TypeOnionNode,2 );
        nodes.push(endPoint);

        this.circuitBuilder = new CircuitBuilder();
        this.circuitBuilder.build(nodes);
        this.circuitBuilder.OnCircuitReady = (circuit : Circuit) => {
            context.renewCertificate(circuit);
        };
    }

    renewCertificate(circuit : Circuit) {

        let ed25519 = forge.pki.ed25519;

        if(this.CachedCertificate == null) {
            let masterKey = ed25519.generateKeyPair();
            let signingKey = ed25519.generateKeyPair();

            // @ts-ignore
            let pkiIdentity = buildIdentity("peerstream", "client", IdentityType.Account, masterKey.publicKey);

            // @ts-ignore
            let stub = newFlatCertificate(signingKey.publicKey, pkiIdentity, certificateLifetime, masterKey.privateKey);

            let kp = new SignedEd25519KeyPair(
                // @ts-ignore
                new Ed25519KeyPair(signingKey.publicKey, signingKey.privateKey),
                stub);

            // cached the signed certificate and signing key for used in result
            this.CachedCertificate = kp;
        }

        let msgb = Buffer.from(stringToAsciiByteArray("psp-auth-1.0"));
        let sm = newSignedMessage(msgb, this.CachedCertificate);
        let authMsg = new AuthRequestCertificate();
        authMsg.certificateStub = sm.marshal();

        let msg = marshal(authMsg);
        circuit.escape(msg);

        let context = this;
        circuit.setEscapeEvent(AuthRequestCertificateResultMessage, (msg)=>{
            context.onAuthRequestCertificationResult(msg as auth.protocol.AuthRequestCertificateResult);
        });

        this.circuitCache = circuit;

        Log("Requesting new certificate invocation for " +  this.CachedCertificate.Certificate.PKIAccountID.Id);
    }

    onAuthRequestCertificationResult(msg : auth.protocol.AuthRequestCertificateResult) {
        // in typescript generated protobuf, msg.result is undefined for success unlike other language like Go and C++.
        // But this is an issue in generation rather than deserialization, In other language, the value is initialize to 0
        // in the generatedd files, but its not re-set during deserialization and remain 0.
        // Generated protobuf file (auth.ts) was modified to fix/set default value similar to other language.
        if( msg.result != undefined && msg.result != auth.protocol.AuthRequestCertificateResult.requestResult.success) {
            Log("Request Authentication of Certificate failed with result " + msg.result);
            return;
        }

        addSignature(this.CachedCertificate.Certificate, Buffer.from(msg.signature), true);
        var context = this;
        if(!this.CachedCertificate.Certificate.validate((identiy)=>{
            return context.validateNodeIdentity(identiy);})) {
            this.registerUser();
            return;
        }

        for (let c of this.onRegistrationComplete) {
            c(this.CachedCertificate);
        }

        this.circuitCache.cleanup();
        this.circuitBuilder.close();

    }

    addOnRegistrationComplete( callback : OnRegistrationComplete) {
        this.onRegistrationComplete.push(callback);
    }

    validateNodeIdentity(identity) : boolean {
        let authNodes = ExtractNodes(this.nodes, names.TypeAuthorityNode);
        let v = authNodes.find((node)=>{
            if( identity != node.Identity)
                return undefined;

            return node;
        });

        return (v != undefined);
    }
}