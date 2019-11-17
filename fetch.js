const FORMAT_MAP = {
    5: {container_extension: 'flv', video_quality: 'Low144'},
    6: {container_extension: 'flv', video_quality: 'Low240'},
    13: {container_extension: 'tgpp', video_quality: 'Low144'},
    17: {container_extension: 'tgpp', video_quality: 'Low144'},
    18: {container_extension: 'mp4', video_quality: 'Medium360'},
    22: {container_extension: 'mp4', video_quality: 'High720'},
    34: {container_extension: 'flv', video_quality: 'Medium360'},
    35: {container_extension: 'flv', video_quality: 'Medium480'},
    36: {container_extension: 'tgpp', video_quality: 'Low240'},
    37: {container_extension: 'mp4', video_quality: 'High1080'},
    38: {container_extension: 'mp4', video_quality: 'High3072'},
    43: {container_extension: 'webm', video_quality: 'Medium360'},
    44: {container_extension: 'webm', video_quality: 'Medium480'},
    45: {container_extension: 'webm', video_quality: 'High720'},
    46: {container_extension: 'webm', video_quality: 'High1080'},
    59: {container_extension: 'mp4', video_quality: 'Medium480'},
    78: {container_extension: 'mp4', video_quality: 'Medium480'},
    82: {container_extension: 'mp4', video_quality: 'Medium360'},
    83: {container_extension: 'mp4', video_quality: 'Medium480'},
    84: {container_extension: 'mp4', video_quality: 'High720'},
    85: {container_extension: 'mp4', video_quality: 'High1080'},
    91: {container_extension: 'mp4', video_quality: 'Low144'},
    92: {container_extension: 'mp4', video_quality: 'Low240'},
    93: {container_extension: 'mp4', video_quality: 'Medium360'},
    94: {container_extension: 'mp4', video_quality: 'Medium480'},
    95: {container_extension: 'mp4', video_quality: 'High720'},
    96: {container_extension: 'mp4', video_quality: 'High1080'},
    100: {container_extension: 'webm', video_quality: 'Medium360'},
    101: {container_extension: 'webm', video_quality: 'Medium480'},
    102: {container_extension: 'webm', video_quality: 'High720'},
    132: {container_extension: 'mp4', video_quality: 'Low240'},
    151: {container_extension: 'mp4', video_quality: 'Low144'},
};

const SESSION_TOKEN_REGEX = /sts:(\d+)/;
const CIPHER_NAME_REGEX = /\.set\([^,]*,encodeURIComponent\((\w*)\(decodeURIComponent/;
// This body regex is a constant _string_ because we have to add a function name to the beginning.
const CIPHER_BODY_REGEX = '=function\\((.+?)\\){(.+?)}';
// We create a regex to match the helper function name.
const CIPHER_HELPER_NAME = /;(.+?)\..+?\(/;
// Same with this one, a string.
const CIPHER_HELPER_BODY_REGEX = '={[\\s\\S]+?};';

function compare_streams(stream_a, stream_b) {
    var a = stream_a.itag_information.video_quality;
    var b = stream_b.itag_information.video_quality;
    if (a > b) {
        // If a is after b alphabetically then we return that a should go before.
        return -1;
    } else if (a == b) {
        return 0;
    } else {
        return 1;
    }
}
// We want reverse sort. a > b will return tre

// Returns a mapping function using a function to decrypt a signature.
// I forego the sp check. Hopefully this doesn't backfire.
function mappable_format_to_streams_function(decrypt) {
    return (function(format) {
        var URL = null;
        if (format.url == undefined) {
            // They don't give us the url outright so we go searching in cipher.
            // There are a bunch of useful values in this cipher property.
            var cipher_params = new URLSearchParams(format.cipher);
            // One of them is the encrypted cipher that we decrypt here.
            var decrypted_signature = decrypt(cipher_params.get("s"));
            URL = cipher_params.get('url') + `&sig=${decrypted_signature}`;
        } else {
            // They did give us the url. Great! I'll abuse that. In these cases there is no cipher.
            URL = format.url;
        }

        return {
            // Might not be actually necessary. There are a ton of useful attributes of the format that might give you this.
            itag_information: FORMAT_MAP[format.itag],
            url: URL,
        };
    });
}

// URLSearchParams should technically be polyfilled but we aren't going to worry about
// that stuff. These are vars so I can continually paste them into the page console to
// test it. Normally they would be constants.
var page_url = window.location.href;
var video_id = new URLSearchParams(page_url.slice(page_url.indexOf("?"))).get("v");
// We fetch video info in order to get potential stream urls. Though we have to do
// some work with ciphers to get there.
var request = await fetch(`https://www.youtube.com/get_video_info?video_id=${video_id}&el=detailpage`);
var text = await request.text();
// For some reason data is sent as a url parameters. I don't know why.
// You should check for errors eventually.
// TODO: You can do so by checking for a status parameter. It's either ok or fail.
var params = new URLSearchParams('?' + text);
var player_response = JSON.parse(params.get('player_response'));

// Let's get the player script from the head to get the deciphering function and
// session token.
var scripts = document.head.getElementsByTagName('script');
var script_src;

for (var i = 0; i < scripts.length; i++) {
    var script = scripts[i];
    if (script.src.indexOf("base.js") != -1) {
        script_src = script.src;
        break;
    }
}

// Now let's send a request out with this source url.
// We want the text to do some regex to build a new function.
var script_request = await fetch(script_src);
var script_text = await script_request.text();

// We have a capture group, we only have one for the regex, so we'll take it.
var sts = script_text.match(SESSION_TOKEN_REGEX)[1];
// We then look for the name of the decipher function knowing how it appears in the script.
var decipher_name = script_text.match(CIPHER_NAME_REGEX)[1];
// We then use the match object. There are two things we can extract from it.
var decipher_match = script_text.match(new RegExp(decipher_name + CIPHER_BODY_REGEX));
// The body in general.
var decipher_body = decipher_match[2];
// The name of the argument used in the body. There will be only one.
var decipher_argument = decipher_match[1];
// And the name of the helper used.
var decipher_helper_name = decipher_body.match(CIPHER_HELPER_NAME)[1];
// Now we extract the declaration of this object, it has no dependencies luckily so that's it.
var decipher_helper_declaration = script_text.match(new RegExp('var ' + decipher_helper_name + CIPHER_HELPER_BODY_REGEX, 'm'))[0];

// Great! Now let's construct those with things evals. We have to use chrome extension's sandboxing
// functionality in order to deal with the strict CSP.
// TODO: Convert this eval to a sandboxed one to be chrome extension compliant.
var decipher = new Function(decipher_argument, decipher_helper_declaration + decipher_body);

// FORMAT_MAP is a constant that we get from the blog post. We look at it to know the
// format streams available.
var formats = player_response['streamingData']['formats'];
var streams = formats.map(mappable_format_to_streams_function(decipher));

// We do a little business logic here. We prefer to give a medium quality version.
// So we sort alphabetically based on itag video_quality (medium is last alphabetically,
// then comes low which we want)
// and then we select any of the videos. We'll probably be able to use all sorts of diff.
// ones.

streams.sort(compare_streams);
console.log(streams[0].url);
