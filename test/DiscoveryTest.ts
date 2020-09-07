
import {EntryNode, Discovery} from "../src/client/Discovery";

describe('Discovery test', () => {
    it('Pull discovery', () => {
        var fingerprint = "BCB322D1626F75C06AA1BD31536EEA84CDAC7232F1CC7851A31AED57713BDF6B";
        var discovery = new Discovery();
        discovery.requestDiscovery(new EntryNode("discovery5", 6005, fingerprint));
        discovery.OnDiscoveryChanged = () =>{
            console.log("Application ready");
        };
    })
});