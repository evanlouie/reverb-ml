module.exports = {
  type: "sqlite",
  database: "reverb-sqlite.sql",
  entities: ["src/entities/*.ts"],
  synchronize: true,
};

// module.exports = {
//   type: "sqljs",
//   location: "reverb-sqljs.sql",
//   entities: ["src/entities/*.ts"],
//   synchronize: true,
//   autoSave: true,
// };
