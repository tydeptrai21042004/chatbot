import { neon } from "@neondatabase/serverless";
import { getSeedOptions, seedDefaultTeacher } from "./lib/default-teacher-seed.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = neon(databaseUrl);
const options = getSeedOptions();

const repository = {
  async findByEmail(email) {
    const rows = await sql`SELECT id,email,name,role,password_hash,must_change_password,created_at FROM users WHERE lower(email)=lower(${email}) LIMIT 1`;
    return rows[0] || null;
  },
  async create(user) {
    const rows = await sql`
      INSERT INTO users(id,email,name,role,password_hash,student_code,must_change_password,created_at)
      VALUES(${user.id},${user.email},${user.name},${user.role},${user.passwordHash},NULL,${user.mustChangePassword},${user.createdAt})
      RETURNING id,email,name,role,password_hash,must_change_password,created_at
    `;
    return rows[0];
  },
  async update(id, patch) {
    const rows = await sql`
      UPDATE users
      SET name=${patch.name}, role=${patch.role}, password_hash=${patch.passwordHash},
          student_code=NULL, must_change_password=${patch.mustChangePassword}
      WHERE id=${id}
      RETURNING id,email,name,role,password_hash,must_change_password,created_at
    `;
    return rows[0];
  },
};

const result = await seedDefaultTeacher(repository, options);
console.log(`Default teacher seed: ${result.action}`);
console.log(`Email: ${options.email}`);
console.log(`Must change password: ${options.mustChangePassword}`);
if (result.action === "unchanged") {
  console.log("Existing password was preserved. Set SEED_RESET_TEACHER_PASSWORD=true to reset it.");
}
