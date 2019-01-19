const request = require('request-promise-native');
const cheerio = require('cheerio');
const _ = require('underscore');

const getOne = function (artist, song) {
    return request('http://lyrics.wikia.com/wiki/' + artist + ':' + song)
        .then(html => {
            const $ = cheerio.load(html);
            $('script').remove();
            let lyrics = ($('.lyricbox').html());

            /**
             * Override default underscore escape map
             */
            const escapeMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&apos;',
                '`': '&#x60;',
                '': '\n'
            };

            const unescapeMap = _.invert(escapeMap);
            const createEscaper = function (map) {
                const escaper = function (match) {
                    return map[match];
                };

                const source = '(?:' + _.keys(map).join('|') + ')';
                const testRegexp = RegExp(source);
                const replaceRegexp = RegExp(source, 'g');
                return function (string) {
                    string = string == null ? '' : '' + string;
                    return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
                };
            };
            _.escape = createEscaper(escapeMap);
            _.unescape = createEscaper(unescapeMap);

            // replace html codes with punctuation
            lyrics = _.unescape(lyrics);
            // remove everything between brackets
            lyrics = lyrics.replace(/\[[^\]]*\]/g, '');
            // remove html comments
            lyrics = lyrics.replace(/(<!--)[^-]*-->/g, '');
            // replace newlines
            lyrics = lyrics.replace(/<br>/g, '\n');
            // remove all tags
            lyrics = lyrics.replace(/<[^>]*>/g, '');

            return Promise.resolve({
                artist: artist,
                song: song,
                lyrics: lyrics
            });
        })
};

const reflect = (p, type, id) => p.then(
    response => ({
        response: response,
        status: 'resolved',
        type: type,
        id: id
    }),
    error => ({
        error: error,
        status: 'rejected',
        type: type,
        id: id
    })
);

const getLyrics = {
    get: getOne,
    getBatch: function (arr) {
        return Promise.all(arr.map((t, i) => reflect(getOne(t.artist, t.song), 'song', i)))
            .then(res => {
                const ret = res.map(r => {
                    if (r.status !== 'resolved') return null;
                    else return res.response;
                }).filter(r => r);
                return Promise.resolve(ret);
            })
    }
};

module.exports = getLyrics;
module.exports.default = getLyrics;