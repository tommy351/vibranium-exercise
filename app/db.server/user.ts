import { InferInsertModel, sql } from "drizzle-orm";
import { usersTable } from "./schema";
import { db } from "./drizzle";

export async function insertUser(data: InferInsertModel<typeof usersTable>) {
  const result = await db
    .insert(usersTable)
    .values(data)
    .onConflictDoUpdate({
      target: [usersTable.slackTeamId, usersTable.slackUserId],
      set: {
        name: sql`EXCLUDED.name`,
        firstName: sql`EXCLUDED.first_name`,
        lastName: sql`EXCLUDED.last_name`,
        realName: sql`EXCLUDED.real_name`,
        displayName: sql`EXCLUDED.display_name`,
        email: sql`EXCLUDED.email`,
        updatedAt: sql`NOW()`,
      },
    })
    .returning({ id: usersTable.id });

  return result[0];
}
