db = db.getSiblingDB('origami-media-plugin-test');

db.createUser({
    user: "origami",
    pwd: "origami",
    roles: ["readWrite", "dbAdmin"]
});
