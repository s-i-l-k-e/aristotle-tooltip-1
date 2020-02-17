import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light-border.css'
import axios from 'axios'

import './tooltip.css'
import {getItemLink, getTextUpToStringPattern, objectAttributeToggler, stripHtmlTags, truncateText} from './utils.js'
import aristotle_logo from './aris_logo_small.png';
import externalLinkSvg from './external-link-alt.svg';


function makeRequest(baseUrl, aristotleId) {
    baseUrl === undefined ? baseUrl = '' : null;
    let url = `${baseUrl}/api/v4/item/${aristotleId}/`;
    return axios.get(url);
}

function handleError(error) {
    let errorMsg = '';

    if (error.response) {
        //  The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        let status_code = error.response.status;

        if (status_code === 401 || status_code === 403) {
            errorMsg = ("ERROR: This item is not publicly viewable");
        } else if (String(status_code).startsWith('5')) {
            // It's a 500 failure
            errorMsg = ("ERROR: The server is currently experiencing errors. Please try again later.");
        } else {
            // Any other failure
            errorMsg = ("ERROR: The server cannot process your request. Please try again later.");
        }
    } else if (error.request) {
        // The request was made but no response was received
        errorMsg = ("ERROR: No response was received from the server. Please try again later");
    }
    return errorMsg;
}

function createTippyElements(baseURL, definitionWords, longDefinitionWords, placement, externalLinkVisible) {
    // Select all elements that contain an aristotle id
    let elements = document.querySelectorAll('[data-aristotle-id]');

    // Create a Tippy object for each element that has an attached aristotle id:
    for (let element of elements) {
        let aristotleId = element.dataset.aristotleId;
        tippy(element, {
            allowHTML: false, // For better security
            content: 'Loading...',
            flipOnUpdate: true, // Because the tooltip changes sizes when the definition successfully loads
            interactive: true,
            theme: 'light-border',
            trigger: 'click',
            placement: placement,
            onCreate(instance) {
                // Keep track of state
                instance._isFetching = false;
                instance._hasFailed = null;
                instance._hasSuceeded = null;
            },
            onShow(instance) {
                if (instance._isFetching || instance._hasFailed || instance._hasSuceeded) {
                    return;
                }
                instance._isFetching = true;

                makeRequest(baseURL, aristotleId).then((response) => {
                    // The response was successful

                    let definition = response.data['definition'];
                    instance.name = response.data['name'];
                    definition = getTextUpToStringPattern(definition, "<table>");
                    definition = getTextUpToStringPattern(definition, "<ul>");
                    definition = getTextUpToStringPattern(definition, "<ol>");
                    definition = stripHtmlTags(definition);
                    instance.definition = truncateText(definition, longDefinitionWords);
                    instance.shortDefinition = response.data['short_definition'];
                    instance.itemLink = getItemLink(baseURL, aristotleId);
                    instance._see_more = false;

                    setHTMLContent(instance, externalLinkVisible);
                    instance._hasSuceeded = true;

                }).catch((error) => {
                    // The response failed
                    let errorMsg = handleError(error);
                    instance.setContent(errorMsg);
                    instance._hasFailed = true;
                });
                instance._isFetching = false;
            }
        });
    }
}

function setHTMLContent(instance, externalLinkVisible) {
    // Build and set the HTML content for the tooltip
    let wrapperDiv = document.createElement('div');
    wrapperDiv.appendChild(createTooltipHeader(instance.name, instance.itemLink, externalLinkVisible));
    wrapperDiv.appendChild(createTooltipBody(instance));
    wrapperDiv.appendChild(createTooltipFooter(instance.itemLink));
    instance.setContent(wrapperDiv);
}

function createTooltipHeader(itemName, url, externalLinkVisible) {
    let wrapperDiv = document.createElement('div');
    let strongTag = document.createElement("strong");
    let externalItemLink = createExternalItemLink(url);
    strongTag.appendChild(document.createTextNode(itemName + " "));
    wrapperDiv.appendChild(strongTag);
    if (externalLinkVisible) {
        wrapperDiv.appendChild(externalItemLink);
    }
    return wrapperDiv;
}

function createTooltipBody(instance) {
    let wrapperDiv = document.createElement('div');
    let contentElementDiv = document.createElement('div');
    let seeMoreDiv = document.createElement('div');
    let seeMoreLessLink = document.createElement('a');
    seeMoreLessLink.classList.add("see-more-link");
    seeMoreLessLink.addEventListener("click", _toggleAristotleTooltipContent.bind(event, instance));
    seeMoreLessLink.href = "#";

    if (instance._see_more) {
        seeMoreLessLink.appendChild(document.createTextNode("...see less"));

        let definitionText;

        if (instance.definition === '') {
            definitionText = "This item does not have a definition.";
        } else {
            definitionText = instance.definition;
        }
        contentElementDiv.appendChild(document.createTextNode(definitionText));
    } else {
        contentElementDiv.appendChild(document.createTextNode(instance.shortDefinition));
        seeMoreLessLink.appendChild(document.createTextNode("...see more"));
    }
    wrapperDiv.appendChild(contentElementDiv);
    seeMoreDiv.appendChild(seeMoreLessLink);
    seeMoreDiv.classList.add("see-more-link");

    if (instance.definition.length !== instance.shortDefinition.length) {
        wrapperDiv.appendChild(seeMoreDiv);
    }

    return wrapperDiv;
}

function createTooltipFooter(url) {
    let wrapperDiv = document.createElement('div');
    let footerTop = createFooterTop(url);
    let footerBottom = createFooterBottom();
    wrapperDiv.appendChild(document.createElement('hr'));
    wrapperDiv.appendChild(footerTop);
    wrapperDiv.appendChild(footerBottom);
    return wrapperDiv;
}

function createFooterTop(url) {
    let wrapperDiv = document.createElement('div');
    let smallTag = document.createElement('small');
    let link = document.createElement('a');
    smallTag.appendChild(document.createTextNode("Source: "));
    link.href = url;
    link.textContent = url;
    smallTag.appendChild(link);
    wrapperDiv.appendChild(smallTag);
    return wrapperDiv;
}

function createFooterBottom() {
    let wrapperDiv = document.createElement('div');
    let smallTag = document.createElement('small');
    let aristotleLogo = createAristotleLogoHTMl();
    smallTag.appendChild(document.createTextNode("Powered by the Aristotle Metadata Registry "));
    wrapperDiv.appendChild(smallTag);
    wrapperDiv.appendChild(aristotleLogo);
    return wrapperDiv;
}

function createExternalItemLink(itemUrl) {
    let externalLink = document.createElement('a');
    let externalLinkIcon = document.createElement('span');
    let supTag = document.createElement('sup');
    externalLinkIcon.innerHTML = externalLinkSvg;
    externalLinkIcon.classList.add('external-link');
    externalLink.href = itemUrl;
    externalLink.appendChild(externalLinkIcon);
    externalLink.setAttribute("target", "_blank"); // Open item in a new tab.
    supTag.title = "View item in a new window";
    supTag.appendChild(externalLink);
    return supTag;
}

function createAristotleLogoHTMl() {
    let img = document.createElement("img");
    img.classList.add('aristotle-logo');
    img.src = aristotle_logo;
    return img;
}


/**
 * This internal function toggles the content of an Aristotle Tooltip and calls a function to generate its HTML content.
 * @param instance Aristotle Tooltip object instance.
 * @private
 */
function _toggleAristotleTooltipContent(instance) {
    objectAttributeToggler(instance, "_see_more");
    setHTMLContent(instance);
}

/**
 * This is the main route through which users will interact with Aristotle Tooltip.
 * @param options Object containing the options available to configure the Aristotle tooltip.
 *
 *           * url - URL address used to fetch definitions from.
 *           theme - CSS theme used to style the Aristotle tooltip objects. Defaults to light-border style.
 *           definitionWords - Number of words included in the tooltip. Defaults to 50 words.
 *           longDefinitionWords - Number of words included in the long definition version of the tooltip.
 *               The "See more..." option will not be visible if this option is not included.
 *           placement - positioning of the tooltip. Defaults to 'bottom'.
 *           externalLinkVisible - Whether or not to display the external item link page
 *
 *
 *
 * NOTE: required options are marked with an asterisk (*).
 */
export function addAristotle(options) {

    let url = "";

    if (options.hasOwnProperty('url')) {
        url = options.url;
    } else {
        console.warn("%c Aristotle Tooltip Error: A url must be provided as an option.",
            'color: Orange');
    }

    let placement = Object.is(options.placement, undefined) ? 'bottom' : options.placement;

    let definitionWords = Object.is(options.definitionWords, undefined) ? 50 : options.definitionWords;
    let longDefinitionWords = options.longDefinitionWords;
    let externalLinkVisible = Object.is(options.externalLinkVisible, undefined) ? true : options.externalLinkVisible;

    console.log("THIS IS EXTERNAL LINK VISIBLE")
    console.log(externalLinkVisible)

    createTippyElements(url, definitionWords, longDefinitionWords, placement, externalLinkVisible, externalLinkVisible);
}
