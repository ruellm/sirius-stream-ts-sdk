export function Log(msg) {
    var today = new Date();
    var date = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

    console.log("[" + date + " " + time + "]: " + msg);
}