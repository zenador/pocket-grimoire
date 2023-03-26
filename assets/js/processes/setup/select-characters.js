import Observer from "../../classes/Observer.js";
import TokenStore from "../../classes/TokenStore.js";
import Dialog from "../../classes/Dialog.js";
import {
    lookup,
    lookupOne,
    lookupCached,
    lookupOneCached,
    replaceContentsMany,
    announceInput
} from "../../utils/elements.js";
import {
    shuffle,
    groupBy
} from "../../utils/arrays.js";
import {
    clamp,
    times
} from "../../utils/numbers.js";

const gameObserver = Observer.create("game");
const tokenObserver = Observer.create("token");

/**
 * Sets the totals for each team based on the breakdown that's given.
 *
 * @param {Object} breakdown
 *        Breakdown of the numbers for the teams.
 */
function setTotals(breakdown, playerCount) {

    Object.entries(breakdown).forEach(([team, count]) => {

        lookupCached(`[data-team="${team}"] .js--character-select--total, [data-team-summary="${team}"] .js--character-select--total`)
            .forEach((element) => {
                element.textContent = count;
            });

    });

    lookupOneCached(".js--players--total").textContent = playerCount;

}

/**
 * Highlights randomly selected entries in each of the teams.
 *
 * @param {String} team
 *        Name of the team that should have entries randomly highlighted.
 * @param {Number} count
 *        The number of randomly selected items that should be highlighted.
 */
function highlightRandomInTeam(team, count) {

    // Don't cache this since they will change if a different edition is chosen.
    const inputs = lookup(`[data-team="${team}"] [name="character"]`);

    if (!inputs.length) {
        return;
    }

    const chosen = shuffle(inputs).slice(0, count);

    inputs.forEach((input) => {

        const isChecked = input.checked;
        input.checked = chosen.includes(input);

        if (isChecked) {
            lookupOne(`input[name="count-${input.value}"]`).value = 1;
        }

        if (input.checked !== isChecked) {
            announceInput(input);
        }

    });

}

gameObserver.on("team-breakdown-loaded", ({ detail }) => {

    const playerCount = lookupOneCached("#player-count");

    playerCount.addEventListener("input", () => {

        gameObserver.trigger("player-count", {
            count: Number(playerCount.value)
        });

    });

    function getBreakdown() {

        const {
            breakdown
        } = detail;

        return breakdown[clamp(0, playerCount.value - 5, breakdown.length - 1)];

    }

    function getPlayerCount() {
        return Number(playerCount.value);
    }

    playerCount.addEventListener("input", () => setTotals(getBreakdown(), getPlayerCount()));
    setTotals(getBreakdown(), getPlayerCount());

    lookupOne("#player-select-random").addEventListener("click", () => {

        let total = 0;

        Object.entries(getBreakdown()).forEach(([team, count]) => {

            highlightRandomInTeam(team, count);
            total += count;

        });

        highlightRandomInTeam("traveller", playerCount.value - total);

    });

});

gameObserver.on("characters-selected", ({ detail }) => {

    const {
        characters
    } = detail;
    const teams = groupBy(characters, (character) => character.getTeam());

    lookupCached("[data-team]").forEach((wrapper) => {

        // Populate the team sections.
        const team = wrapper.dataset.team;
        const isTeamPopulated = Array.isArray(teams[team]);
        wrapper.hidden = !isTeamPopulated;

        replaceContentsMany(
            lookupOneCached(".js--character-select--list", wrapper),
            (teams[team] || []).map((character) => character.drawSelect())
        );

        // Deselect any checkboxes and set the counts to zero.
        lookup(".js--character-select--input", wrapper).forEach((input) => {
            input.checked = false;
        });

        lookupOneCached(".js--character-select--count", wrapper).textContent = 0;

        // Store the "count" inputs.
        // This allows us to quickly add all the values together to get the
        // number of tokens selected in this group, regardless of whether tokens
        // have been added, removed, or duplicated.
        wrapper.countInputs = lookup("input[name^=\"count\"]", wrapper);

    });

    // Make sure the Number of players can't exceed the number of characters.
    let maxPlayers = 15;
    maxPlayers += Math.min((teams.traveller || []).length, 5);
    maxPlayers = Math.min(maxPlayers, characters.length);
    const playerCount = lookupOneCached("#player-count");

    playerCount.max = maxPlayers;

    if (playerCount.value >= maxPlayers) {

        playerCount.value = maxPlayers;
        announceInput(playerCount);

    }

    // Enable the "Select Characters" button.
    lookupOneCached("#select-characters").disabled = false;

});

lookupOne("#toggle-abilities").addEventListener("input", ({ target }) => {

    lookupCached("[data-team]").forEach((wrapper) => {
        wrapper.classList.toggle("is-hide-abilities", !target.checked);
    });

});

lookupOne("#toggle-duplicates").addEventListener("input", ({ target }) => {

    const {
        checked
    } = target;

    lookupCached("[data-team]").forEach((wrapper) => {

        wrapper.classList.toggle("is-show-duplicates", checked);

        if (!checked) {

            lookup("[name^=\"count-\"]", wrapper).forEach((input) => {

                const {
                    value
                } = input;

                if (value > 1) {

                    input.value = 1;
                    announceInput(input);

                }

            });

        }

    });

});

lookupCached("[data-team]").forEach((wrapper) => {

    wrapper.addEventListener("change", ({ target }) => {

        if (!target.matches("input[name=\"character\"]")) {
            return;
        }

        gameObserver.trigger("character-toggle", {
            element: target,
            id: target.value,
            active: target.checked
        });

    });

    wrapper.addEventListener("input", ({ target }) => {

        if (!target.matches("input[name^=\"count\"]")) {
            return;
        }

        gameObserver.trigger("character-count-change", {
            element: target,
            id: target.dataset.for,
            count: Number(target.value)
        });

    });

    wrapper.addEventListener("click", ({ target }) => {

        const button = target.closest("[data-quantity-amount]");

        if (!button) {
            return;
        }

        const input = button.input || lookupOne(
            ".js--character-select--count",
            button.closest(".js--character-select--duplicate-wrapper")
        );
        button.input = input;

        const value = Number(input.value) || 0;
        const delta = Number(button.dataset.quantityAmount) || 0;
        const amount = value + delta;

        input.value = amount;

        if (amount) {
            announceInput(input);
        } else {

            const checkbox = lookupOne(
                ".js--character-select--input",
                button.closest(".js--character-select")
            );
            checkbox.checked = false;
            announceInput(checkbox);

        }

    });

});

gameObserver.on("character-toggle", ({ detail }) => {

    const {
        id,
        active,
        element
    } = detail;

    const input = lookupOne(`input[name="count-${id}"]`);
    const value = Number(input.value);

    element
        .closest(".js--character-select")
        .classList
        .toggle("is-selected", active);

    if (active) {

        if (value < 1) {
            input.value = 1;
        }

    } else {
        input.value = 0;
    }

    announceInput(input);

});

gameObserver.on("character-count-change", ({ detail }) => {

    const {
        element
    } = detail;
    const wrapper = element.closest("[data-team]");
    const countElement = lookupOneCached(
        ".js--character-select--count",
        wrapper
    );

    var groupTokenCount = wrapper.countInputs.reduce((total, input) => {
        return total + Number(input.value);
    }, 0);
    countElement.textContent = groupTokenCount;
    lookupOne('[data-team-summary="'+wrapper.dataset.team+'"] .js--character-select--count').textContent = groupTokenCount;
    
    const tokenCountElements = lookupCached(".js--tokens--count");
    const countElements = lookupCached("[data-team] .js--character-select--count");
    var totalTokenCount = countElements.reduce((total, input) => {
        return total + Number(input.textContent);
    }, 0);
    tokenCountElements.forEach((element) => {
        element.textContent = totalTokenCount;
    });

});

lookupOne("#player-select").addEventListener("submit", (e) => {

    e.preventDefault();

    const ids = lookup(":checked", e.target).map(({ value }) => value);

    TokenStore.ready((tokenStore) => {

        const filtered = tokenStore
            .getAllCharacters()
            .filter((character) => ids.includes(character.getId()))
            .map((character) => {

                // We use times() instead of Array#fill() here because fill()
                // didn't seem to work correctly.

                const duplicates = [];

                times(
                    lookupOne(`input[name="count-${character.getId()}"]`).value,
                    () => duplicates.push(character)
                );

                return duplicates;

            })
            .flat();

        gameObserver.trigger("character-draw", {
            characters: filtered,
            isShowAll: e.submitter.id === "player-select-all"
        });

        Dialog.create(lookupOneCached("#character-select")).hide();

    });

});

// lookupOne("#player-select-all").addEventListener("click", () => {
//
//
//
// });

tokenObserver.on("toggle-jinx-active", ({ detail }) => {

    const {
        jinx,
        state
    } = detail;
    const input = lookupOne(
        `.js--character-select--input[value="${jinx.getTarget()?.getId()}"]`
    );

    if (input) {

        input
            .closest(".js--character-select--label")
            ?.querySelector(".js--character-select--name")
            ?.classList.toggle("is-jinx", state);

    }

});
