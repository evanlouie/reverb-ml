module.exports = {
  type: "sqlite",
  database: "reverb.sqlite3",
  entities: ["src/entities/*.ts"],
  synchronize: true,
};
