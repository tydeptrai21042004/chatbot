import { randomUUID, scryptSync } from "node:crypto";

export const DEFAULT_TEACHER = Object.freeze({
  email: "1@gmail.com",
  password: "123",
  name: "Giáo viên",
  role: "teacher",
});

export function hashSeedPassword(password, salt = randomUUID()) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("SEED_PASSWORD_REQUIRED");
  }
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function getSeedOptions(env = process.env) {
  const production = env.NODE_ENV === "production";
  const allowWeakDefault = env.ALLOW_INSECURE_DEFAULT_TEACHER === "true";
  if (production && !allowWeakDefault) {
    throw new Error(
      "REFUSED_WEAK_PRODUCTION_SEED: set ALLOW_INSECURE_DEFAULT_TEACHER=true only for the initial controlled deployment",
    );
  }
  return {
    email: (env.SEED_TEACHER_EMAIL || DEFAULT_TEACHER.email).trim().toLowerCase(),
    password: env.SEED_TEACHER_PASSWORD || DEFAULT_TEACHER.password,
    name: (env.SEED_TEACHER_NAME || DEFAULT_TEACHER.name).trim(),
    resetExistingPassword: env.SEED_RESET_TEACHER_PASSWORD === "true",
    mustChangePassword: env.SEED_TEACHER_MUST_CHANGE_PASSWORD !== "false",
  };
}

export async function seedDefaultTeacher(repository, options) {
  if (!repository?.findByEmail || !repository?.create || !repository?.update) {
    throw new Error("INVALID_SEED_REPOSITORY");
  }
  const existing = await repository.findByEmail(options.email);
  if (existing) {
    if (!options.resetExistingPassword) {
      return { action: "unchanged", user: existing };
    }
    const updated = await repository.update(existing.id, {
      name: options.name,
      role: "teacher",
      passwordHash: hashSeedPassword(options.password),
      mustChangePassword: options.mustChangePassword,
    });
    return { action: "updated", user: updated };
  }

  const created = await repository.create({
    id: randomUUID(),
    email: options.email,
    name: options.name,
    role: "teacher",
    passwordHash: hashSeedPassword(options.password),
    mustChangePassword: options.mustChangePassword,
    createdAt: Date.now(),
  });
  return { action: "created", user: created };
}
