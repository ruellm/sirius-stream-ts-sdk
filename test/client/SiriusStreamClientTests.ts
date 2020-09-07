import {SiriusStreamClient} from "../../src/client/SiriusStreamClient";

describe('Sirius Stream Client test', () => {
    it('can register user', () => {
      let client = new SiriusStreamClient();
      let userdata = null

       client.start();
       client.OnApplicationReady = () => {
           client.register((data)=>{
               userdata = data;     //demonstrate that users of sdk needs to store it at app level
               client.loginUser(data);
           });
       };

       client.OnLoginSucees =()=>{
         //  var userId = "peerstream.client.account.MVtLwMU3E7JydgTZnKrfmrMM146nKS32cYcmjtqN5zTxkqfGr";
         //  client.createChannel(userId, null);
       };
    })
});