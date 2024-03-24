import {
    times
} from "../utils/numbers.js";

export default class Positioner {

    /**
     * A collection of layout methods that work out the co-ordinates for tokens.
     * @type {Object}
     */
    static layouts = {

        ellipse(data) {
            return computeCoordinates(data, "ellipse");
        },

        rectangular_ellipse(data) {
            return computeCoordinates(data, "rect_ellipse");
        },

        rectangle(data) {
            return computeCoordinates(data, "rect");
        },

        diagonal(data) {

            const {
                width,
                height,
                tokenWidth,
                tokenHeight,
                total
            } = data;
            const coordinates = [];
            const xIncrement = (width - tokenWidth) / total;
            const yIncrement = (height - tokenHeight) / total;

            times(total, (index) => {
                coordinates[index] = [xIncrement * index, yIncrement * index];
            });

            return coordinates;

        },

        horizontal(data) {
            return Positioner.layouts.diagonal(data).map(([x, y]) => [x, 0]);
        },

        vertical(data) {
            return Positioner.layouts.diagonal(data).map(([x, y]) => [0, y]);
        }

    };

    constructor() {

        this.setDefaults();

    }

    /**
     * Sets the default values for various parts.
     */
    setDefaults() {

        const topLeft = {
            width: 0,
            height: 0
        };

        this.setContainerSize(topLeft);
        this.setTokenSize(topLeft);
        this.setTotal(0);

    }

    /**
     * Sets the container size.
     *
     * @param {Object} size
     *        Container size.
     * @param {Number|String} size.width
     *        Width of the container, in pixels.
     * @param {Number|String} size.height
     *        Height of the container, in pixels.
     */
    setContainerSize({ width, height }) {

        /**
         * The width of the container, in pixels.
         * @type {Number}
         */
        this.width = Number(width) || 0;

        /**
         * The height of the container, in pixels.
         * @type {Number}
         */
        this.height = Number(height) || 0;

    }

    /**
     * Sets the token size.
     *
     * @param {Object} size
     *        Token size.
     * @param {Number|String} size.width
     *        Width of the token, in pixels.
     * @param {Number|String} size.height
     *        Height of the token, in pixels.
     */
    setTokenSize({ width, height }) {

        /**
         * The width of the tokens, in pixels.
         * @type {Number}
         */
        this.tokenWidth = Number(width) || 0;

        /**
         * The height of the tokens, in pixels.
         * @type {Number}
         */
        this.tokenHeight = Number(height) || 0;

    }

    /**
     * Sets the total number of tokens.
     *
     * @param {Number|String}
     *        The total number of expected tokens.
     */
    setTotal(total) {

        /**
         * The total number of expected tokens.
         * @type {Number}
         */
        this.total = Number(total) || 0;

    }

    /**
     * Sets the layout that will be used to work out the co-ordinates of the
     * tokens.
     *
     * @param {String} layout
     *        The layout that should be used.
     */
    setLayout(layout) {
        this.layout = layout;
    }

    /**
     * Gets the data needed to work out the co-ordinates for the tokens.
     *
     * @return {Object}
     *         Data needed to work out the co-ordinates.
     */
    getData() {

        return Object.freeze({
            width: this.width,
            height: this.height,
            tokenWidth: this.tokenWidth,
            tokenHeight: this.tokenHeight,
            total: this.total
        });

    }

    /**
     * Generates the co-ordinates for the tokens.
     *
     * @return {Array.<Array>}
     *         Co-ordinates for the tokens.
     * @throws {ReferenceError}
     *         {@link Positioner#layout} should be a key in
     *         {@link Positioner.layouts}.
     */
    generateCoords() {

        const {
            constructor: {
                layouts
            },
            layout
        } = this;
        const method = layouts[layout];

        if (!method) {
            throw new ReferenceError(`Unrecognised layout type "${layout}"`);
        }

        return method(this.getData());

    }

}

function computeCoordinates(data, placementLayout) {
    const {
        width,
        height,
        tokenWidth,
        tokenHeight,
        total
    } = data;
    const coordinates = [];
    const rX = (width - (tokenWidth + 20)) / 2;
    const rY = (height - (tokenHeight + 39)) / 2;
    const centreX = rX;
    const centreY = rY;
    
    // https://stackoverflow.com/a/6972434
    function dp(radians) {
        if (placementLayout === "ellipse")
            return Math.sqrt( (rX * Math.sin(radians)) ** 2 + (rY * Math.cos(radians)) ** 2 );

        if (placementLayout === "rect_ellipse") {
            // return Math.sqrt( (rX * (1 / (Math.cbrt(Math.cos(radians)) ** 2)) / 3 * -Math.sin(radians)) ** 2 + (rY * (1 / (Math.cbrt(Math.sin(radians)) ** 2)) / 3 * Math.cos(radians)) ** 2 );
            return Math.sqrt( (rX / 3 / (Math.cbrt(Math.cos(radians)) ** 2) * -Math.sin(radians)) ** 2 + (rY / 3 / (Math.cbrt(Math.sin(radians)) ** 2) * Math.cos(radians)) ** 2 );
        }

        if (radians < 0)
            radians += (Math.PI * 2);
        if (radians >= (Math.PI * 2))
            radians -= (Math.PI * 2);

        if (0 <= radians && radians < (Math.PI / 2))
            return 2 * rX * Math.abs(Math.sin(2 * radians));
        if ((Math.PI / 2) <= radians && radians < Math.PI)
            return 2 * rY * Math.abs(Math.sin(2 * radians));
        if (Math.PI <= radians && radians < (3 * Math.PI / 2))
            return 2 * rX * Math.abs(Math.sin(2 * radians));
        if ((3 * Math.PI / 2) <= radians && radians < (Math.PI * 2))
            return 2 * rY * Math.abs(Math.sin(2 * radians));
    }
    var precision = 0.001;
    if (placementLayout === "rect_ellipse")
        precision = 0.00001;
    var offset = Math.PI * -0.5;
    if (placementLayout === "rect_ellipse")
        offset += 0.000001;
    else if (placementLayout === "rect")
        offset = Math.PI * -0.75;
    var circ = 0;
    for (var radians = 0 + offset; radians < (Math.PI * 2 + offset); radians += precision) {
        circ += dp(radians);
    }
    var nextPoint = 0;
    var run = 0;
    for (var radians = 0 + offset; radians < (Math.PI * 2 + offset); radians += precision) {
        if ((total * run / circ) >= nextPoint) {
            nextPoint++;
            var pointX, pointY;
            if (placementLayout === "ellipse") {
                pointX = centreX + (Math.cos(radians) * rX);
                pointY = centreY + (Math.sin(radians) * rY);
            } else if (placementLayout === "rect_ellipse") {
                pointX = centreX + (Math.cbrt(Math.cos(radians)) * rX);
                pointY = centreY + (Math.cbrt(Math.sin(radians)) * rY);
            } else if (placementLayout === "rect") {
                pointX = centreX + ((Math.abs(Math.cos(radians)) * Math.cos(radians) - Math.abs(Math.sin(radians)) * Math.sin(radians)) * rX);
                pointY = centreY + ((Math.abs(Math.cos(radians)) * Math.cos(radians) + Math.abs(Math.sin(radians)) * Math.sin(radians)) * rY);
            }
            coordinates.push([pointX, pointY]);
        }
        run += dp(radians);
    }

    return coordinates;
}
