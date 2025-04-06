CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"first_name" text,
	"last_name" text,
	"real_name" text,
	"display_name" text,
	"slack_user_id" text NOT NULL,
	"slack_team_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_slackTeamId_slackUserId_unique" UNIQUE("slack_team_id","slack_user_id")
);
