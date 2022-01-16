import Observer from "./Observer.js";
import {
    clamp
} from "../utils/numbers.js";
import {
    noop,
    rafThrottle
} from "../utils/functions.js";

const tokenObserver = Observer.create("token");

/**
 * Handles the tokens being draggable.
 */
export default class Tokens {

    /**
     * @param {Element} pad
     *        The pad that the tokens are dragged around within.
     */
    constructor(pad) {

        /**
         * The pad that thte tokens are in.
         * @type {Element}
         */
        this.pad = pad;

        this.reset();
        this.updatePadDimensions();
        this.addListeners();

    }

    /**
     * Resets some key properties.
     */
    reset() {

        /**
         * The current z-index. By constantly increasing this, we can always put
         * the most recently touched token on the top, allowing reminders to sit
         * on top of characters, for example.
         * @type {Number}
         */
        this.zIndex = 0;

        /**
         * The handler to be executed when dragging a token or reminder.
         * @type {Function}
         */
        this.dragHandler = noop;

        /**
         * A flag for knowing whether the user intention is dragging or
         * clicking. This only seems to be neeed for the desktop.
         * @type {Boolean}
         */
        this.isDragging = false;

        /**
         * The horizontal offset for the token being dragged.
         * @type {Number}
         */
        this.xOffset = 0;

        /**
         * The vertical offset for the token being dragged.
         * @type {Number}
         */
        this.yOffset = 0;

    }

    /**
     * Updates the record of the dimensions of {@link Tokens#pad}.
     */
    updatePadDimensions() {

        const rect = this.pad.getBoundingClientRect();

        /**
         * The offset left of {@link Token#pad}.
         * @type {Number}
         */
        this.padLeft = rect.left;

        /**
         * The offset top of {@link Token#pad}.
         * @type {Number}
         */
        this.padTop = rect.top;

        /**
         * The width of {@link Token#pad}.
         * @type {Number}
         */
        this.padWidth = rect.width;

        /**
         * The height of {@link Token#pad}.
         * @type {Number}
         */
        this.padHeight = rect.height;

    }

    /**
     * Adds event listeners to key elements.
     */
    addListeners() {

        document.addEventListener("mousedown", this);
        document.addEventListener("touchstart", this);
        document.addEventListener("mouseup", this);
        document.addEventListener("touchend", this);
        document.addEventListener("click", this);
        window.addEventListener("resize", this);
        window.addEventListener("scroll", this);

        const styleObserver = new MutationObserver(() => {
            this.updatePadDimensions();
        });

        styleObserver.observe(this.pad, {
            attributes: true,
            attributeFilter: ["style"]
        });

    }

    /**
     * Increases {@link Tokens#zIndex} before returning it.
     *
     * @return {Number}
     *         The next value of {@link Tokens#zIndex}.
     */
    getNextZIndex() {

        this.zIndex += 1;

        return this.zIndex;

    }

    /**
     * Works out the event being heard and executes the correct handler.
     *
     * @param {Event} e
     *        The event that has been heard.
     */
    handleEvent(e) {

        const target = e.target;
        const token = (
            typeof target.closest === "function"
            ? target.closest(".js--token--wrapper")
            : null
        );
        const scollHandler = rafThrottle((e) => this.onScroll(e));

        switch (e.type) {

        case "mousedown":
        case "touchstart":
            this.onMousedown(token, e);
            break;

        case "mouseup":
        case "touchend":
            this.onMouseup(e);
            break;

        case "click":
            this.onClick(token, e);
            break;

        case "resize":
            this.onResize(e);
            break;

        case "scroll":
            scollHandler(e);
            break;

        }

    }

    /**
     * Handles a mouse down or touch start event.
     *
     * @param {Element} token
     *        The token that has been touched.
     * @param {Event} e
     *        The event.
     */
    onMousedown(token, e) {

        if (!token) {
            return;
        }

        this.startDrag(token, e);
        token.style.setProperty("--z-index", this.getNextZIndex());

    }

    /**
     * Handles a mouse up or touch end event.
     *
     * @param {Event} e
     *        The event.
     */
    onMouseup(e) {
        this.endDragging();
    }

    /**
     * Handles a click event.
     *
     * @param {Element} token
     *        The token that has been touched.
     * @param {Event} e
     *        The event.
     */
    onClick(token, e) {

        if (!token || this.isDragging) {
            return;
        }

        const type = token.closest("[data-token]");
        const tokenType = type.dataset.token;

        // character-click or reminder-click event.
        tokenObserver.trigger(`${tokenType}-click`, {
            element: type,
            data: JSON.parse(type.dataset[tokenType])
        });

    }

    /**
     * Handles a resize event.
     *
     * @param {Event} e
     *        The event.
     */
    onResize(e) {
        this.updatePadDimensions();
    }

    /**
     * Handles a scroll event.
     *
     * @param {Event} e
     *        The event.
     */
    onScroll(e) {
        this.updatePadDimensions();
    }

    /**
     * Handles the dragging being started.
     *
     * @param {Element} element
     *        The token being dragged.
     * @param {Event} event
     *        The mouse down or touch start event.
     */
    startDrag(element, event) {

        const {
            type,
            clientX,
            clientY,
            targetTouches
        } = event;
        const {
            left,
            top
        } = element.getBoundingClientRect();

        this.dragHandler = (event) => this.dragObject(element, event);

        if (type === "mousedown") {

            this.xOffset = clientX - left + this.padLeft;
            this.yOffset = clientY - top + this.padTop;
            window.addEventListener("mousemove", this.dragHandler);

        } else if (type === "touchstart" && targetTouches.length) {

            this.xOffset = targetTouches[0].clientX - left + this.padLeft;
            this.yOffset = targetTouches[0].clientY - top + this.padTop;
            window.addEventListener("touchmove", this.dragHandler, {
                passive: false
            });

        }

    }

    /**
     * Moves a token being dragged.
     *
     * @param {Element} element
     *        The token being dragged.
     * @param {Event} event
     *        The mouse move or touch move event.
     */
    dragObject(element, event) {

        // Sometimes attempting to drag a token will scroll the page. I'm not
        // sure why that happens, but this check is designed to prevent errors
        // being thrown when it does.
        if (event.cancelable) {
            event.preventDefault();
        }

        const {
            type,
            clientX,
            clientY,
            targetTouches
        } = event;
        const {
            width,
            height
        } = element.getBoundingClientRect();
        let leftValue = 0;
        let topValue = 0;

        if (type === "mousemove") {

            leftValue = clientX - this.xOffset;
            topValue = clientY - this.yOffset;
            this.isDragging = true;

        } else if (type === "touchmove" && targetTouches.length) {

            leftValue = targetTouches[0].clientX - this.xOffset;
            topValue = targetTouches[0].clientY - this.yOffset;

        }

        element.style.setProperty(
            "--left",
            clamp(0, leftValue, this.padWidth - width)
        );
        element.style.setProperty(
            "--top",
            clamp(0, topValue, this.padHeight - height)
        );

    }

    /**
     * Handles the token dragging finishing.
     */
    endDragging() {

        if (this.dragHandler !== noop) {

            window.removeEventListener("mousemove", this.dragHandler);
            window.removeEventListener("touchmove", this.dragHandler, {
                passive: false
            });
            this.dragHandler = noop;

            // The order of events is mousedown -> mouseup -> click. This means
            // that we need to delay the resetting of `this.isDragging` so that
            // the handler attached to the click event listener doesn't trigger
            // after dragging. This only seems to be an issue on desktop, mobile
            // seems to be fine.
            window.requestAnimationFrame(() => this.isDragging = false);

        }

    }

}