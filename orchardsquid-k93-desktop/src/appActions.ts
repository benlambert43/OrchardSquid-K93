export const appActions = ["remove", "restore", "uninstall"] as const;

export type AppAction = (typeof appActions)[number];
