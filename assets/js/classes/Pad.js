import Tokens from "./Tokens.js";
import Template from "./Template.js";
import {
    lookupOne,
    lookupOneCached
} from "../utils/elements.js";

/**
 * Handles tokens being added to the main pad section.
 */
export default class Pad {

    /**
     * Returns the actual character token from the given token button.
     *
     * @param  {Element} button
     *         Button whose token should be returned.
     * @return {Element}
     *         Token that was found.
     * @throws {ReferenceError}
     *         The given button must contain a token.
     */
    static getToken(button) {

        const token = lookupOneCached(".js--character", button);

        if (!token) {
            throw new ReferenceError("Unable to find character token");
        }

        return token;

    }

    /**
     * @param {Element} element
     *        The main pad element.
     * @param {Observer} observer
     *        An observer that will trigger events at key times.
     */
    constructor(element, observer) {

        /**
         * The main pad element.
         * @type {Element}
         */
        this.element = element;

        /**
         * An observer that can trigger events at key times.
         * @type {Observer}
         */
        this.observer = observer;

        /**
         * The class that allows the tokens to be dragged around.
         * @type {Tokens}
         */
        this.tokens = new Tokens(element, observer);

        /**
         * The template for adding a token to the pad.
         * @type {Template}
         */
        this.template = Template.create(lookupOne("#token-template"));
        // NOTE: should this be passed to the class instead of being created
        // here?

        /**
         * All characters that have been added.
         * @type {Array.<Object>}
         */
        this.characters = [];

        /**
         * All reminders that have been added.
         * @type {Array.<Object>}
         */
        this.reminders = [];

        this.placementTotal = 0;
        this.placementTokenSize = 0;
        this.placementPadWidth = 0;
        this.placementPadHeight = 0;
        this.placementCoords = [];
        this.placementLayout = "unknown";

    }

    /**
     * Adds a character to the {@link Pad#element}.
     *
     * @param  {CharacterToken} character
     *         The character to add.
     * @return {Object}
     *         An object with the token and the character that was added.
     */
    addCharacter(character) {

        const {
            element,
            characters,
            observer,
            template
        } = this;

        element.append(
            template.draw({
                ".js--token--wrapper"(element) {

                    element.append(character.drawToken());
                    element.dataset.token = "character";

                }
            })
        );

        const token = element.lastElementChild;
        const info = Object.freeze({
            character,
            token
        });

        characters.push(info);
        observer.trigger("character-add", info);

        return info;

    }
    
    generatePlacements(total, tokenSize, padWidth, padHeight) {
        var placementLayout = lookupOne("#select-placement-layout").value;

        if (this.placementTotal == total && this.placementTokenSize == tokenSize && this.placementPadWidth == padWidth && this.placementPadHeight == padHeight && this.placementLayout === placementLayout)
            return;

        this.placementTotal = total;
        this.placementTokenSize = tokenSize;
        this.placementPadWidth = padWidth;
        this.placementPadHeight = padHeight;
        this.placementCoords = [];
        this.placementLayout = placementLayout;

        if (placementLayout === "linear") {
            const linearOffset = Math.max(
                15,
                padWidth / 18
            );
            for (var i = 1; i <= total; i++) {
                const pointX = i * linearOffset;
                const pointY = linearOffset;
                this.placementCoords.push([pointX, pointY]);
            }
            return;
        }

        const centreX = (padWidth - (tokenSize + 20)) / 2;
        const centreY = (padHeight - (tokenSize + 39)) / 2;
        const rX = centreX;
        const rY = centreY;
        /*
        // uncorrected positioning, weird clumping
        for (var i = 0; i < total; i++) {
            var radians = 2 * Math.PI / total * i;
            var pointX, pointY;

            if (placementLayout === "ellipse") {
                radians -= (Math.PI * 0.5);
                pointX = centreX + (Math.cos(radians) * rX);
                pointY = centreY + (Math.sin(radians) * rY);
            } else if (placementLayout === "rect_ellipse") {
                radians -= (Math.PI * 0.5);
                pointX = centreX + (Math.cbrt(Math.cos(radians)) * rX);
                pointY = centreY + (Math.cbrt(Math.sin(radians)) * rY);
            } else if (placementLayout === "rect") {
                radians -= (Math.PI * 0.75);
                pointX = centreX + ((Math.abs(Math.cos(radians)) * Math.cos(radians) - Math.abs(Math.sin(radians)) * Math.sin(radians)) * rX);
                pointY = centreY + ((Math.abs(Math.cos(radians)) * Math.cos(radians) + Math.abs(Math.sin(radians)) * Math.sin(radians)) * rY);
            }

            this.placementCoords.push([pointX, pointY]);
        }
        */
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
                this.placementCoords.push([pointX, pointY]);
            }
            run += dp(radians);
        }
    }

    /**
     * Adds a new character to {@link Pad#element} (see
     * {@link Pad#addCharacter}) and moves it to the correct location.
     *
     * @param  {CharacterToken} character
     *         The character to add.
     * @return {Object}
     *         An object with the token and the character that was added.
     */
    addNewCharacter(character, total) {

        const {
            element,
            tokens,
            characters
        } = this;
        const info = this.addCharacter(character);

        const tokenSize = lookupOne("button.token").offsetWidth;// * getComputedStyle(document.documentElement).getPropertyValue('--token-size');
        this.generatePlacements(total, tokenSize, element.offsetWidth, element.offsetHeight);
        const [pointX, pointY] = this.placementCoords[characters.length - 1];

        tokens.moveTo(
            info.token,
            pointX,
            pointY,
            tokens.advanceZIndex()
        );

        return info;

    }

    /**
     * Exposes the ability to move a token to the correct place.
     *
     * @param {Element} token
     *        Token to move.
     * @param {Number} left
     *        Left position, in pixels.
     * @param {Number} top
     *        Top position, in pixels.
     * @param {Number} [zIndex]
     *        Optional z-index.
     */
    moveToken(token, left, top, zIndex) {
        this.tokens.moveTo(token, left, top, zIndex);
    }

    /**
     * Exposes the given token's position. See {@link Tokens#getPosition}.
     *
     * @param  {Element} token
     *         Token whose position should be returned.
     * @return {Object}
     *         Co-ordinates for the token.
     */
    getTokenPosition(token) {
        return this.tokens.getPosition(token);
    }

    /**
     * Removes a character from {@link Pad#element}
     *
     * @param {CharacterToken} character
     *        The character to remove.
     */
    removeCharacter(character) {

        const {
            characters,
            observer
        } = this;
        const index = characters
            .findIndex((info) => info.character === character);

        if (index < 0) {
            return;
        }

        const {
            token
        } = characters[index];

        token.remove();

        if (!this.preserveReference) {
            characters.splice(index, 1);
        }

        observer.trigger("character-remove", {
            character,
            token
        });

    }

    /**
     * Gets the {@link CharacterToken} instance associated with the given
     * element. If an instance isn't found, undefined is returned.
     *
     * @param  {Element} token
     *         The token element whose data should be returned.
     * @return {CharacterToken|undefined}
     *         The matching character data, or undefined if there is no match.
     */
    getCharacterByToken(token) {
        return this.characters.find((info) => info.token === token)?.character;
    }

    /**
     * A helper function for removing a character by the token rather than the
     * {@link CharacterToken} instance.
     *
     * @param {Element} token
     *        The token whose character should be removed.
     */
    removeCharacterByToken(token) {
        this.removeCharacter(this.getCharacterByToken(token));
    }

    /**
     * Toggles the dead state for the character that's been given.
     *
     * @param {CharacterToken} character
     *        The character whose dead state should be toggled.
     * @param {Boolean} [deadState]
     *        Optional dead state to set.
     */
    toggleDead(character, deadState) {

        const {
            characters,
            observer
        } = this;
        const info = characters.find((info) => info.character === character);

        if (!info) {
            return;
        }

        const {
            token
        } = info;

        const wasDead = character.getIsDead();
        const isDead = character.toggleDead(deadState);
        this.constructor
            .getToken(token)
            .classList
            .toggle("is-dead", isDead);
        observer.trigger("shroud-toggle", {
            wasDead,
            isDead,
            token,
            character
        });

    }

    /**
     * A helper function for toggling the dead state of a character by their
     * element rather than the {@link CharacterToken} instance.
     *
     * @param {Element} token
     *        Element whose associated character should have their dead state
     *        toggled.
     * @param {Boolean} [deadState]
     *        Optional dead state to set.
     */
    toggleDeadByToken(token, deadState) {
        this.toggleDead(this.getCharacterByToken(token), deadState);
    }

    /**
     * Toggles the rotated state for the character that's been given.
     *
     * @param {CharacterToken} character
     *        The character whose rotated state should be toggled.
     * @param {Boolean} [rotateState]
     *        Optional rotated state to set.
     */
    rotate(character, rotateState) {

        const {
            characters,
            observer
        } = this;
        const info = characters.find((info) => info.character === character);

        if (!info) {
            return;
        }

        const {
            token
        } = info;

        const isUpsideDown = character.rotate(rotateState);
        this.constructor
            .getToken(token)
            .classList
            .toggle("is-upside-down", isUpsideDown);
        observer.trigger("rotate-toggle", {
            isUpsideDown,
            token,
            character
        });

    }

    /**
     * A helper function for toggling the rotated state of a character by their
     * element rather than the {@link CharacterToken} instance.
     *
     * @param {Element} token
     *        Element whose associated character should have their rotated state
     *        toggled.
     * @param {Boolean} [deadState]
     *        Optional rotated state to set.
     */
    rotateByToken(token, rotateState) {
        this.rotate(this.getCharacterByToken(token), rotateState);
    }

    /**
     * Sets the player name for the character that's been given.
     *
     * @param {CharacterToken} character
     *        The character to set the player name for.
     * @param {String} name
     *        The player name to display with the character token.
     */
    setPlayerName(character, name) {

        const {
            characters,
            observer
        } = this;
        const info = characters.find((info) => info.character === character);

        if (!info) {
            return;
        }

        const {
            token
        } = info;

        const nameTag = lookupOneCached(
            ".js--character--player-name",
            this.constructor.getToken(token)
        );

        if (!nameTag) {
            return;
        }

        name = (name || "").trim();
        nameTag.textContent = name;
        observer.trigger("set-player-name", {
            name,
            token,
            character
        });

        character.setPlayerName(name);

    }

    /**
     * A helper function for setting the player name of a character by their
     * element rather than the {@link CharacterToken} instance.
     *
     * @param {Element} token
     *        The token element.
     * @param {String} name
     *        The player name to display with the character token.
     */
    setPlayerNameForToken(token, name) {
        this.setPlayerName(this.getCharacterByToken(token), name);
    }

    /**
     * Adds a reminder to {@link Pad#element}.
     *
     * @param  {ReminderToken} reminder
     *         The reminder to add.
     * @return {Object}
     *         An object with the token and the reminder that was added.
     */
    addReminder(reminder) {

        const {
            element,
            reminders,
            observer,
            template
        } = this;

        element.append(
            template.draw({
                ".js--token--wrapper"(element) {

                    element.append(reminder.drawToken());
                    element.dataset.token = "reminder";
                    element.dataset.reminder = reminder.getId();

                }
            })
        );

        const token = element.lastElementChild;
        const info = Object.freeze({
            reminder,
            token
        });

        reminders.push(info);
        observer.trigger("reminder-add", info);

        return info;

    }

    /**
     * Removes the reminder from {@link Pad#element}.
     *
     * @param {ReminderToken} reminder
     *        The reminder to remove.
     */
    removeReminder(reminder) {

        const {
            reminders,
            observer
        } = this;
        const index = reminders.findIndex((info) => info.reminder === reminder);

        if (index < 0) {
            return;
        }

        const {
            token
        } = reminders[index];

        token.remove();

        if (!this.preserveReference) {
            reminders.splice(index, 1);
        }

        observer.trigger("reminder-remove", {
            reminder,
            token
        });

    }

    /**
     * Gets the {@link ReminderToken} that's associated with the given element.
     * If no match can be found, undefined is returned.
     *
     * @param  {Element} token
     *         The token element whose associated reminder data should be
     *         returned.
     * @return {ReminderToken|undefined}
     *         The matching data or undefined if no match can be found.
     */
    getReminderByToken(token) {
        return this.reminders.find((info) => info.token === token)?.reminder;
    }

    /**
     * A helper function for removing a reminder by the token element rather
     * than the {@link ReminderToken} instance.
     *
     * @param {Element} token
     *        The reminder element.
     */
    removeReminderByToken(token) {
        this.removeReminder(this.getReminderByToken(token));
    }

    /**
     * Removes all characters and tokens from {@link Pad#element} and calls
     * {@link Tokens#reset}.
     */
    reset() {

        const {
            characters,
            reminders
        } = this;

        /**
         * A flag that prevents the arrays {@link Pad#characters} and
         * {@link Pad#reminders} being modified through
         * {@link Pad#removeCharacter} and {@link Pad#removeReminder}.
         * Preserving the reference allows the characters and reminders to be
         * removed with a loop and without entries being skipped.
         * @type {Boolean}
         */
        this.preserveReference = true;

        characters.forEach(({ character }) => {
            this.removeCharacter(character);
        });
        characters.length = 0;

        reminders.forEach(({ reminder }) => {
            this.removeReminder(reminder);
        });
        reminders.length = 0;

        this.preserveReference = false;

        this.tokens.reset();

    }

    /**
     * Helper function for executing {@link Tokens#updatePadDimensions} on
     * {@link Pad#tokens}.
     */
    updateDimensions() {
        this.tokens.updatePadDimensions();
    }

    /**
     * Helper function for executing {@link Tokens#zetZIndex} on
     * {@link Pad#tokens}.
     *
     * @param {Number} zIndex
     *        Z-index to set.
     */
    setZIndex(zIndex) {
        this.tokens.setZIndex(zIndex);
    }

}
