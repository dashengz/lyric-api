const request = require('request-promise-native');
const cheerio = require('cheerio');
const _ = require('underscore');


module.exports = {
    get: function (artist, song) {
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

                return Promise.resolve(lyrics);
            })
    }
};