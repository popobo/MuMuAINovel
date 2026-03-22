import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

/**
 * 创建或更新管理员账号（写入 passwordHash，可用登录页用户名+密码登录）。
 *
 * 密码：
 *   - 默认在交互式终端中提示输入（不回显），并确认一次。
 *   - 非交互环境（CI 等）可设置环境变量 ADMIN_PASSWORD。
 *
 * 其它环境变量：
 *   DATABASE_URL        必填
 *   ADMIN_USERNAME      默认 admin
 *   ADMIN_EMAIL         可选
 *   ADMIN_DISPLAY_NAME  可选，默认与 ADMIN_USERNAME 相同
 *
 * 运行：pnpm create-admin
 */
const SALT_ROUNDS = 12;

/** 在 TTY 下逐字读取一行密码，不回显（Ctrl+C 退出）。 */
function readPasswordHidden(prompt: string): Promise<string> {
  const input = process.stdin;
  const output = process.stdout;

  return new Promise((resolve, reject) => {
    if (!input.isTTY) {
      reject(new Error("当前不是交互式终端，无法隐藏输入。"));
      return;
    }

    output.write(prompt);

    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    let password = "";

    const cleanup = (): void => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
    };

    const onData = (chunk: Buffer | string): void => {
      const s = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (const ch of s) {
        const c = ch.charCodeAt(0);
        if (c === 3) {
          cleanup();
          output.write("\n");
          process.exit(130);
          return;
        }
        if (c === 127 || c === 8) {
          password = password.slice(0, -1);
          continue;
        }
        if (c === 13 || c === 10) {
          cleanup();
          output.write("\n");
          resolve(password);
          return;
        }
        password += ch;
      }
    };

    input.on("data", onData);
  });
}

async function resolvePassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv !== undefined && fromEnv.length > 0) {
    if (fromEnv.length < 8) {
      throw new Error("ADMIN_PASSWORD 至少 8 个字符。");
    }
    return fromEnv;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "未设置 ADMIN_PASSWORD。请在本地终端运行 pnpm create-admin 并按提示输入密码；或在 CI/脚本中设置环境变量 ADMIN_PASSWORD。",
    );
  }

  const p1 = await readPasswordHidden("管理员密码（至少 8 位，输入不可见）: ");
  const p2 = await readPasswordHidden("请再次输入密码: ");
  if (p1 !== p2) {
    throw new Error("两次输入的密码不一致。");
  }
  if (p1.length < 8) {
    throw new Error("密码至少 8 个字符。");
  }
  return p1;
}

async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const email =
    process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.length > 0
      ? process.env.ADMIN_EMAIL
      : undefined;
  const displayName = process.env.ADMIN_DISPLAY_NAME ?? username;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("未设置 DATABASE_URL。");
  }

  const password = await resolvePassword();

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash,
        displayName,
        ...(email !== undefined ? { email } : {}),
      },
      create: {
        username,
        email: email ?? null,
        displayName,
        passwordHash,
      },
    });

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
      },
    });

    console.log(
      `管理员已就绪：username=${user.username}  id=${user.id}  displayName=${user.displayName ?? ""}`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`错误：${message}`);
  process.exitCode = 1;
});
