import Token from "./Token.js";
import Template from "./Template.js";
import Dialog from "./Dialog.js";
import {
    empty,
    identify,
    appendMany,
    lookupOneCached
} from "../utils/elements.js";

const emptyProperty = Symbol("empty");
const customProperty = Symbol("custom");

/**
 * A version of {@link Token} that handles character information.
 */
export default class CharacterToken extends Token {

    /**
     * A property that we use to work out if this token is the empty character.
     * @type {Symbol}
     * @constant
     */
    static get empty() {
        return emptyProperty;
    }

    /**
     * A property that we use to work out if this token is a custom character.
     * @type {Symbol}
     * @constant
     */
    static get custom() {
        return customProperty;
    }

    /**
     * Sets the templates that will be access when drawing views.
     *
     * @param {Object} templates
     *        A map of keys to {@link Template} instances.
     */
    static setTemplates(templates) {

        /**
         * The templates that all instances will access.
         * @type {Object}
         */
        this.templates = templates;

    }

    /**
     * Shows a dialog that displays the character token and their ability, so
     * that it can be shown to a player.
     *
     * @param  {CharacterToken} character
     *         The character to show.
     * @throws {Error}
     *         The character has to exist.
     */
    static show(character) {

        if (!character) {
            throw new Error("No character given, cannot show");
        }

        lookupOneCached("#token-name").textContent = character.getName();
        empty(lookupOneCached("#token-show")).append(character.drawToken());
        lookupOneCached("#token-ability").textContent = character.getAbility();
        Dialog.create(lookupOneCached("#token")).show();

    }

    /**
     * @inheritDoc
     */
    processData(data) {

        // Provide some default values so that .get() methods don't worry about
        // missing data and instead worry about typos.

        return {
            id: "",
            name: "",
            edition: "",
            team: "",
            firstNight: 0,
            firstNightReminder: "",
            otherNight: 0,
            otherNightReminder: "",
            reminders: [],
            setup: false,
            ability: "",
            image: "",
            ...data
        };

    }

    /**
     * @inheritDoc
     */
    setup() {

        /**
         * A flag showing whether or not the character is dead.
         * @type {Boolean}
         */
        this.isDead = false;

        /**
         * A flag showing whether or not the character is upside down,
         * indicating that the character is the opposite alignment (or on the
         * evil team if it's a traveller).
         * @type {Boolean}
         */
        this.isUpsideDown = false;

        /**
         * The name of the player with this character.
         * @type {String}
         */
        this.playerName = '';

        /**
         * A collection of all jinxes that may affect this character.
         * @type {Array.<Jinx>}
         */
        this.jinxes = [];

        /**
         * Collection of all reminders that this character uses.
         * @type {Array.<ReminderToken>}
         */
        this.reminders = [];

    }

    /**
     * @inheritDoc
     */
    clone() {

        const clone = super.clone();

        this.getReminders().forEach((reminder) => {
            clone.addReminder(reminder.clone());
        });

        this.getJinxes().forEach((jinx) => {
            clone.addJinx(jinx);
        });

        return clone;

    }

    /**
     * Adds a reminder for this character.
     *
     * @param {ReminderToken} reminder
     *        Instance of {@link ReminderToken} for the reminder.
     */
    addReminder(reminder) {
        this.reminders.push(reminder);
    }

    /**
     * Gets the reminders that this character has. The returned array may be
     * empty if the character doesn't have any reminders.
     *
     * @return {Array.<ReminderToken>}
     *         All the reminders for this character.
     */
    getReminders() {
        return this.reminders;
    }

    /**
     * Toggles the dead state for this character. The state can be forced by
     * passing a boolean to this method.
     *
     * @param  {Boolean} [state]
     *         Optional state to set. If ommitted, the state is toggled.
     * @return {Boolean}
     *         The new state.
     */
    toggleDead(state) {

        if (state === undefined) {
            state = !this.isDead;
        }

        this.isDead = state;

        return this.getIsDead();

    }

    /**
     * Exposes {@link CharacterToken#isDead}.
     *
     * @return {Boolean}
     *         true if the character is dead, false otherwise.
     */
    getIsDead() {
        return Boolean(this.isDead);
    }

    /**
     * Toggles the upside-down state for this character. The state can be forced
     * by passing a boolean to this method.
     *
     * @param  {Boolean} [state]
     *         Optional state to set. If ommitted, the state is toggled.
     * @return {Boolean}
     *         The new state.
     */
    rotate(state) {

        if (state === undefined) {
            state = !this.isUpsideDown;
        }

        this.isUpsideDown = state;

        return this.getIsUpsideDown();

    }

    /**
     * Exposes {@link CharacterToken#isUpsideDown}.
     *
     * @return {Boolean}
     *         true if the character is upside-down, false otherwise.
     */
    getIsUpsideDown() {
        return Boolean(this.isUpsideDown);
    }

    /**
     * Sets the name of the player for this character.
     *
     * @param  {String} [state]
     *         Optional state to set. If ommitted, the state is toggled.
     */
    setPlayerName(name) {
        this.playerName = name;
    }

    /**
     * Checks to see if the given character matches this one. It may not be the
     * same object, it may be a clone.
     *
     * @param  {CharacterToken} character
     *         Character to check.
     * @return {Boolean}
     *         true if the character matches, false if it doesn't.
     */
    matches(character) {
        return character === this || character.getId() === this.getId();
    }

    /**
     * Adds a jinx top {@link CharacterToken#jinxes}.
     *
     * @param {Jinx} jinx
     *        Jinx to add.
     */
    addJinx(jinx) {

        jinx.setTarget(this);

        this.jinxes.push(jinx);

    }

    /**
     * Sets any jinxes that match any of the given characters "ready".
     *
     * @param {Array.<CharacterToken>} characters
     *        Characters that may be tricks in a jinx.
     */
    readyAllJinxes(characters) {

        characters.forEach((character) => {
            this.toggleJinxReady(character, true);
        });

    }

    /**
     * Sets all jinxes in {@link CharacterToken#jinxes} to unready.
     */
    unreadyAllJinxes() {
        this.jinxes.forEach((jinx) => jinx.toggleReady(false));
    }

    /**
     * Toggles the ready state of a jinx. Optionally the state can be defined.
     *
     * @param {Character} character
     *        Character that has a jinx with this character.
     * @param {Boolean} [state]
     *        Optional state to force. If ommitted, the state is toggled.
     */
    toggleJinxReady(character, state) {

        this.jinxes.forEach((jinx) => {

            if (jinx.matches(character)) {
                jinx.toggleReady(state);
            }

        });

    }

    /**
     * Toggles the active state of a jinx. Optionally the state can be defined.
     *
     * @param {CharacterToken} trick
     *        Character that has a jinx with this character.
     * @param {Boolean} [state]
     *        Optional state to force. If ommitted, the state is toggled.
     */
    toggleJinxTrick(trick, state) {

        this.jinxes.forEach((jinx) => {

            if (jinx.matches(trick)) {
                jinx.toggleTrick(state);
            }

        });

    }

    /**
     * Sets the target state for all the jinxes in
     * {@link CharacterToken#jinxes}.
     *
     * @param {Boolean} [state]
     *        Optional state to set. If ommited, the state of each of the jinxes
     *        will be toggled.
     */
    toggleJinxTarget(state) {
        this.jinxes.forEach((jinx) => jinx.toggleTarget(state));
    }

    /**
     * Exposes {@link CharacterToken#jinxes}.
     *
     * @return {Array.<Jinx>}
     *         Collection of all jinxes.
     */
    getJinxes() {
        return this.jinxes;
    }

    /**
     * Exposes all the ready jinxes.
     *
     * @return {Array.<Jinx>}
     *         Collection of all ready jinxes.
     */
    getReadyJinxes() {
        return this.jinxes.filter((jinx) => jinx.isReady());
    }

    /**
     * Exposes all the active jinxes.
     *
     * @return {Array.<Jinx>}
     *         Collection of all active jinxes.
     */
    getActiveJinxes() {
        return this.jinxes.filter((jinx) => jinx.isActive());
    }

    /**
     * Checks to see if this is the empty character token.
     *
     * @return {Boolean}
     *         true if this is the empty character token, false otherwise.
     */
    isEmpty() {
        return Boolean(this.data[emptyProperty]);
    }

    /**
     * Checks to see if this is a custom character token.
     *
     * @return {Boolean}
     *         true if this is a custom character token, false otherwise.
     */
    isCustom() {
        return Boolean(this.data[customProperty]);
    }

    /**
     * Draws the token that can be shown on the grimoire.
     *
     * @return {DocumentFragment}
     *         Populated token.
     */
    drawToken() {

        const {
            name,
            image,
            reminders = [],
            remindersGlobal = [],
            firstNight,
            otherNight,
            setup
        } = this.data;

        return this.constructor.templates.token.draw([
            [
                ".js--character--leaves",
                "",
                (element) => {

                    element.classList.toggle("character--setup", setup);
                    element.classList.toggle("character--left-1", firstNight);
                    element.classList.toggle("character--right-1", otherNight);
                    const top = reminders.length + remindersGlobal.length;
                    element.classList.toggle(`character--top-${top}`, top);

                }
            ],
            [
                ".js--character--image",
                image,
                Template.setSrc
            ],
            [
                ".js--character--name",
                name
            ]
        ]);

    }

    /**
     * Draws the character token list item.
     *
     * @return {DocumentFragment}
     *         Populated character token list item.
     */
    drawList() {

        const {
            id
        } = this.data;

        return this.constructor.templates.list.draw([
            [
                ".js--character-list--button",
                id,
                (element, content) => element.dataset.tokenId = content
            ],
            [
                ".js--character-list--token",
                this.drawToken(),
                Template.append
            ]
        ]);

    }

    /**
     * Draws the character's icon, name, and ability for the "Select Characters"
     * dialog box.
     *
     * @return {DocumentFragment}
     *         Populated select entry.
     */
    drawSelect() {

        const {
            id,
            name,
            image,
            ability,
            setup
        } = this.data;

        return this.constructor.templates.select.draw([
            [
                ".js--character-select--image",
                image,
                Template.setSrc
            ],
            [
                ".js--character-select--name",
                name,
                (element, content) => {

                    Template.setText(element, content);
                    element.classList.toggle("is-setup", setup);

                }
            ],
            [
                ".js--character-select--ability",
                ability
            ],
            [
                ".js--character-select--input",
                id,
                (element, content) => {

                    element.value = content;
                    element.closest("label").htmlFor = identify(element);

                }
            ],
            [
                ".js--character-select--count",
                id,
                (element, content) => {
                    element.name += content;
                    element.dataset.for = content;
                }
            ]
        ]);

    }

    /**
     * Draws the entry in the Night Order lists for this token.
     *
     * @param  {Boolean} [isFirst=true]
     *         A flag for whether the entry should be for the first night (true)
     *         or other nights (false). Defaults to true.
     * @return {DocumentFragment}
     *         Populated night order entry.
     */
    drawNightOrder(isFirst = true) {

        const {
            id,
            name,
            image,
            firstNight,
            firstNightReminder,
            otherNight,
            otherNightReminder
        } = this.data;

        return this.constructor.templates.nightOrder.draw([
            [
                ".js--night-info--wrapper",
                [
                    id,
                    (
                        isFirst
                        ? firstNight
                        : otherNight
                    )
                ],
                (element, [id, order]) => {

                    element.dataset.id = id;
                    element.dataset.order = order;

                }
            ],
            [
                ".js--night-info--icon",
                image,
                Template.setSrc
            ],
            [
                ".js--night-info--role",
                name
            ],
            [
                ".js--night-info--ability",
                (
                    isFirst
                    ? firstNightReminder
                    : otherNightReminder
                )
            ]
        ]);

    }

}
