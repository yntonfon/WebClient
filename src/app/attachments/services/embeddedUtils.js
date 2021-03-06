import { toUnsignedString } from '../../../helpers/string';
import transformEscape from '../../message/helpers/transformEscape';

/* @ngInject */
function embeddedUtils(attachmentFileFormat, tools) {
    const DIV = document.createElement('DIV');
    const REGEXP_CID_START = /^cid:/g;

    /**
     * Flush the container HTML and return the container
     * @param {String} content
     * @return {Node} Empty DIV
     */
    const getBodyParser = (content = '') => transformEscape(DIV, { content, action: '', isDocument: false });

    /**
     * Removes enclosing quotes ("", '', &lt;&gt;) from a string
     * @param {String} value - String to be converted
     * @return {String} value - Converted string
     */
    function trimQuotes(input) {
        const value = `${input || ''}`.trim(); // input can be a number

        if (
            ['"', "'", '<'].indexOf(value.charAt(0)) > -1 &&
            ['"', "'", '>'].indexOf(value.charAt(value.length - 1)) > -1
        ) {
            return value.substr(1, value.length - 2);
        }

        return value;
    }

    const readCID = (Headers = {}) => {
        if (Headers['content-id']) {
            return trimQuotes(Headers['content-id']);
        }

        // We can find an image without cid so base64 the location
        if (Headers['content-location']) {
            return trimQuotes(Headers['content-location']);
        }

        return '';
    };

    /**
     * Find embedded element in div
     * @param {String} cid
     * @param {HTMLElement} testDiv
     * @return {Array}
     */
    const findEmbedded = (cid, testDiv) => {
        const selector = [
            `img[src="${cid}"]`,
            `img[src="cid:${cid}"]`,
            `img[data-embedded-img="${cid}"]`,
            `img[data-embedded-img="cid:${cid}"]`,
            `img[data-src="cid:${cid}"]`,
            `img[proton-src="cid:${cid}"]`
        ];
        return [].slice.call(testDiv.querySelectorAll(selector.join(', ')));
    };

    /**
     * Check if an attachment is embedded
     * @param {Object} attachment
     * @param {String} body
     * @return {Boolean}
     */
    const isEmbedded = ({ Headers = {}, MIMEType = '' }, body = '') => {
        const testDiv = getBodyParser(body);
        const cid = readCID(Headers);
        const nodes = findEmbedded(cid, testDiv);

        return nodes.length && attachmentFileFormat.isEmbedded(MIMEType);
    };

    /**
     * Extract embedded attachment from body
     * @param {Array} attachments
     * @param {Node} testDiv
     * @return {Array}
     */
    const extractEmbedded = (attachments = [], testDiv) => {
        return attachments.filter(({ Headers = {} }) => {
            const cid = readCID(Headers);
            const nodes = findEmbedded(cid, testDiv);

            return nodes.length;
        });
    };

    const getAttachementName = (Headers = {}) => {
        if (Headers['content-disposition'] !== 'inline') {
            const [, name] = (Headers['content-disposition'] || '').split('filename=');

            if (name) {
                return name.replace(/"/g, '');
            }
        }

        return '';
    };

    /**
     * Generate CID from input and email
     * @param {String} input
     * @param {String} email
     * @return {String} cid
     */
    const generateCid = (input, email) => {
        const hash = toUnsignedString(tools.hash(input), 4);
        const domain = email.split('@')[1];
        return `${hash}@${domain}`;
    };

    /**
     * Get the url for an embedded image
     * @param  {Node} node Image
     * @return {String}
     */
    const srcToCID = (node) => {
        const attribute = node.getAttribute('data-embedded-img') || '';
        return attribute.replace(REGEXP_CID_START, '');
    };

    const getBlobFromURL = (url = '') => {
        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.onload = function onload() {
                if (xhr.status === 200) {
                    return resolve(xhr.response);
                }
                reject(xhr.response);
            };

            xhr.send();
        });
    };

    return {
        findEmbedded,
        isEmbedded,
        extractEmbedded,
        getAttachementName,
        generateCid,
        srcToCID,
        readCID,
        trimQuotes,
        getBodyParser,
        getBlobFromURL
    };
}
export default embeddedUtils;
