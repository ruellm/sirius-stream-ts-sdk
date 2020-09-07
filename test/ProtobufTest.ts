import * as schema from "../proto/out/discovery"
import * as defines from "../src/defines/SiriusStream";
import * as auth from "../proto/out/auth";

describe('Protobuf Test', () => {
    it('can serialize discover', () => {
       var discovery = new schema.protocol.PullDiscovery();
       discovery.version = defines.DiscoveryRequestProtocolNum;

       var data = discovery.serialize();
       console.log(data);
    })
});