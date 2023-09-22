const { customAlphabet, nanoid } = require("nanoid");
const numeric = "0123456789";
const alphanumeric = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

module.exports = function (type = "default", length) {
    if (type === "default") return nanoid(length);
    if (type === "alphanumeric") return customAlphabet(alphanumeric, length || 21)();
    if (type === "numeric") return customAlphabet(numeric, length || 36)();
    return nanoid(length);
};
