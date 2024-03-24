import {
    lookupOne,
    announceInput
} from "../utils/elements.js";

const detailsPlayerMsgs = lookupOne("details#player-messages");
const button = lookupOne("#clear-player-msgs", detailsPlayerMsgs);
const field = lookupOne("textarea#player-msgs", detailsPlayerMsgs);

button.addEventListener("click", () => {

    field.value = "";
    announceInput(field);

});
