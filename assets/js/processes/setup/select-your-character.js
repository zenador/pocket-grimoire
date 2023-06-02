import Observer from "../../classes/Observer.js";
import Dialog from "../../classes/Dialog.js";
import TokenStore from "../../classes/TokenStore.js";
import Template from "../../classes/Template.js";
import {
    empty,
    lookup,
    lookupOne,
    lookupOneCached,
    replaceContentsMany
} from "../../utils/elements.js";
import {
    shuffle
} from "../../utils/arrays.js";

const gameObserver = Observer.create("game");
const characterDecisionDialog = Dialog.create(lookupOne("#character-decision"));
const playerName = lookupOne("#player-name");

gameObserver.on("character-draw", ({ detail }) => {

    if (detail.isShowAll) {
        return;
    }

    const template = Template.create(
        lookupOneCached("#character-choice-template")
    );

    replaceContentsMany(
        lookupOneCached("#character-choice-wrapper"),
        shuffle(detail.characters)
            .map((character, i) => template.draw({
                "[data-id]"(element) {
                    element.dataset.id = character.getId();
                },
                ".js--character-choice--number"(element) {
                    element.textContent = i + 1;
                }
            }))
    );

    Dialog.create(lookupOneCached("#character-choice")).show();

});

gameObserver.on("character-draw", ({ detail }) => {

    if (!detail.isShowAll) {
        return;
    }

    TokenStore.ready((tokenStore) => {

        const total = detail.characters.length;

        detail.characters.forEach((character) => {

            gameObserver.trigger("character-drawn", {
                character: character.clone(),
                isAutoAdd: true,
                total
            });

        });

        lookupOneCached("#grimoire").open = true;

    });

});

lookupOneCached("#character-choice").addEventListener("click", ({ target }) => {

    const element = target.closest("[data-id]");

    if (!element || element.disabled) {
        return;
    }

    const total = lookup("button.character-choice", this).length;

    TokenStore.ready((tokenStore) => {

        // Add a clone of the character so that duplicated characters are still
        // considered unique.

        gameObserver.trigger("character-drawn", {
            element,
            character: tokenStore.getCharacter(element.dataset.id).clone(),
            total
        });

    });

});

gameObserver.on("character-drawn", ({ detail }) => {

    const {
        element
    } = detail;

    if (element) {
        element.disabled = true;
    }

});

gameObserver.on("character-drawn", ({ detail }) => {

    const {
        isAutoAdd,
        character
    } = detail;

    if (isAutoAdd) {
        return;
    }

    empty(lookupOneCached("#character-decision-wrapper")).append(
        character.drawToken()
    );
    lookupOneCached("#character-decision-ability").textContent = (
        character.getAbility()
    );
    characterDecisionDialog.show();

});

// Allow a name to be set when the character is revealed.
// We do this by checking to see if a name was entered when the "remember your
// character" dialog is closed, using it if it was.

let character = null;

gameObserver.on("character-drawn", ({ detail }) => {
    character = detail.character;
});

characterDecisionDialog.on(Dialog.SHOW, () => {
    playerName.value = playerName.defaultValue;
});

characterDecisionDialog.on(Dialog.HIDE, () => {

    const {
        pad
    } = lookupOneCached(".js--pad");
    const {
        value
    } = playerName;
    const trimmed = (value || "").trim();

    if (pad && trimmed && character) {
        pad.setPlayerName(character, trimmed);
    }

    character = null;

});
