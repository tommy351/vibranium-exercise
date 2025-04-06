import { WebClient } from "@slack/web-api";
import { requireEnv } from "../env";

export const SLACK_TOKEN = requireEnv("SLACK_TOKEN");

export const slackClient = new WebClient(SLACK_TOKEN);
