import mysql from "mysql2";

export const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // default XAMPP
  database: "registrar_information_system"
});
