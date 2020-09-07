import {Discovery, EntryNode} from "./Discovery";
import {Authentication} from "./Authentication";
import {Log} from "../utils/Logger";
import {SignedEd25519KeyPair} from "../cert/KeyPair";
import {AnnouncePresence} from "./AnnouncePresence";
import {LookUpPresenceManager} from "./LookupPresenceManager";
import {OnChannelCreated} from "./Rendezvous";

export type OnSiriusStreamCallback = () => void;
export type OnRegisterSucceed = (data) => void;

export class SiriusStreamClient {
    private discovery : Discovery;
    private authentication : Authentication;
    private annuncePresence: AnnouncePresence;

    private onApplicationReady : OnSiriusStreamCallback;
    private onLoginSucess : OnSiriusStreamCallback;
    private onRegisterSucceed : OnRegisterSucceed;
    private onChannelCreated : OnChannelCreated;
    private onChannelInvited : OnChannelCreated;

    private certificateCached : Array<SignedEd25519KeyPair>;
    private currentLoginData = SignedEd25519KeyPair;

    constructor() {
        this.certificateCached = new Array<SignedEd25519KeyPair>();
    }

    start(callback? : OnSiriusStreamCallback) {
        var context = this;

        // TODO: temporary, load from a config for discovery entry points
        // there should be a config folder andn a config.ts/js that contains the bootstrap nodes
        var fingerprint = "BCB322D1626F75C06AA1BD31536EEA84CDAC7232F1CC7851A31AED57713BDF6B";

        if(callback)
            this.onApplicationReady = callback;

        this.discovery = new Discovery();
        this.discovery.requestDiscovery(new EntryNode("discovery5", 6005, fingerprint));
        this.discovery.OnDiscoveryChanged = () =>{
            Log("Application ready");
            if(context.onApplicationReady)
                context.onApplicationReady();
        };
    }

    set CurrentLoggedinData(data : SignedEd25519KeyPair) {
        // @ts-ignore
        this.currentLoginData = data;
    }

    register(callback? : OnRegisterSucceed) {
        var context = this;
        if(this.discovery.NodeList.length == 0)
            throw ("There are no nodes available to connect, perform start() firsst");

        if(callback)
            this.onRegisterSucceed = callback;

        this.authentication = new Authentication();
        this.authentication.Nodes = this.discovery.NodeList;
        this.authentication.registerUser();
        this.authentication.addOnRegistrationComplete((data) => {
            context.certificateCached.push(data);
            if(context.onRegisterSucceed)
                context.onRegisterSucceed(data);
        })
    }

    loginUser(userData : SignedEd25519KeyPair, onSuccess? : OnSiriusStreamCallback, onInvited? : OnChannelCreated) {

        if(onSuccess)
            this.onLoginSucess = onSuccess;

        if(onInvited)
            this.onChannelInvited = onInvited;

        var context = this;
        this.annuncePresence = new AnnouncePresence();
        this.annuncePresence.Nodes = this.discovery.NodeList;
        this.annuncePresence.loginUser(userData);
        this.annuncePresence.OnInvitedToChannel = this.onChannelInvited;
        this.annuncePresence.OnAnnouncePresenceSucees = ()=> {
            context.CurrentLoggedinData = userData;
            if(context.onLoginSucess)
                context.onLoginSucess();
        };
    }

    createChannel(userId : string, userData : SignedEd25519KeyPair = null, onSuccess? : OnChannelCreated) {

        if(onSuccess)
            this.onChannelCreated = onSuccess;

        let lookup = new LookUpPresenceManager();
        // @ts-ignore
        lookup.Signature = (userData)? userData : this.currentLoginData;
        lookup.OnChannelCreateSuccess = this.onChannelCreated;
        lookup.do(userId, this.discovery.NodeList);
    }

    set OnApplicationReady(callback : OnSiriusStreamCallback) {
        this.onApplicationReady = callback;
    }

    set OnRegistrationComplete(callback : OnRegisterSucceed) {
        this.onRegisterSucceed = callback;
    }

    set OnLoginSucees(callback : OnSiriusStreamCallback) {
        this.onLoginSucess = callback;
    }

    set OnChannelCreated(callback : OnChannelCreated) {
        this.onChannelCreated = callback;
    }

    set OnChannelInvited (callback : OnChannelCreated) {
        this.onChannelInvited = callback;
    }

    get CertificateCached() {
        return this.certificateCached;
    }
}``